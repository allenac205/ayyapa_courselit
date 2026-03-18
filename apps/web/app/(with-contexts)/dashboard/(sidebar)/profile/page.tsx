"use client";

import DashboardContent from "@components/admin/dashboard-content";
import { AddressContext, ProfileContext } from "@components/contexts";
import { Media, Profile } from "@courselit/common-models";
import {
    Avatar,
    AvatarFallback,
    AvatarImage,
    Image,
    MediaSelector,
    useToast,
} from "@courselit/components-library";
import { Field, FieldGroup, FieldLabel, FieldSet } from "@components/ui/field";
import { FetchBuilder } from "@courselit/utils";
import { MIMETYPE_IMAGE } from "@ui-config/constants";
import {
    BUTTON_SAVE,
    BUTTON_SAVING,
    TOAST_TITLE_ERROR,
    MEDIA_SELECTOR_REMOVE_BTN_CAPTION,
    MEDIA_SELECTOR_UPLOAD_BTN_CAPTION,
    ENROLLED_COURSES_HEADER,
    PROFILE_PAGE_HEADER,
    PROFILE_SECTION_DETAILS,
    PROFILE_SECTION_DETAILS_BIO,
    PROFILE_SECTION_DETAILS_EMAIL,
    PROFILE_SECTION_DETAILS_NAME,
    PROFILE_SECTION_DISPLAY_PICTURE,
} from "@ui-config/strings";
import { FormEvent, useContext, useEffect, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@components/ui/card";
import { Input } from "@components/ui/input";
import { Textarea } from "@components/ui/textarea";
import { Button } from "@components/ui/button";
import type { ContentItem } from "@/components/admin/my-content/content";
import { ProgressBar } from "@components/admin/my-content/progress-bar";

const breadcrumbs = [{ label: PROFILE_PAGE_HEADER, href: "#" }];

type UserCourse = {
    id: string;
    title: string;
    slug?: string;
    type: string;
    totalLessons: number;
    completedLessons: number;
    completionPercentage: number;
    imageUrl?: string;
};

export default function Page() {
    const [bio, setBio] = useState("");
    const [name, setName] = useState("");
    // const [user, setUser] =
    //     useState<Pick<Profile, "bio" | "name" | "avatar">>();
    const [avatar, setAvatar] = useState<Partial<Media>>({});
    const [subscribedToUpdates, setSubscribedToUpdates] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const initialDetailsRef = useRef<{ name: string; bio: string }>({
        name: "",
        bio: "",
    });
    const { toast } = useToast();

    const { profile, setProfile } = useContext(ProfileContext);
    const address = useContext(AddressContext);
    const [courses, setCourses] = useState<UserCourse[]>([]);
    const [coursesLoading, setCoursesLoading] = useState(false);

    useEffect(() => {
        const getUser = async function (userId: string) {
            const query = `
        query {
          user: getUser(userId: "${userId}") {
            name,
            bio,
            email,
            subscribedToUpdates,
            avatar {
                mediaId,
                originalFileName,
                mimeType,
                size,
                access,
                file,
                thumbnail,
                caption
            },
          }
        }
      `;
            const fetch = new FetchBuilder()
                .setUrl(`${address.backend}/api/graph`)
                .setPayload(query)
                .setIsGraphQLEndpoint(true)
                .build();

            try {
                const response = await fetch.exec();
                if (response.user) {
                    // setUser(response.user);
                    setName(response.user.name);
                    setBio(response.user.bio);
                    setAvatar(response.user.avatar);
                    setSubscribedToUpdates(response.user.subscribedToUpdates);
                    initialDetailsRef.current = {
                        name: response.user.name ?? "",
                        bio: response.user.bio ?? "",
                    };
                }
            } catch (err: any) {
                toast({
                    title: TOAST_TITLE_ERROR,
                    description: err.message,
                    variant: "destructive",
                });
            }
        };
        if (profile?.userId && address.backend) {
            getUser(profile.userId);
        }
    }, [profile, address.backend]);

    useEffect(() => {
        if (!profile || !address.backend) {
            return;
        }

        const loadCourses = async () => {
            setCoursesLoading(true);

            const query = `
                query {
                    content: getUserContent {
                        entityType
                        entity {
                            id
                            title
                            slug
                            totalLessons
                            completedLessonsCount
                            featuredImage {
                                thumbnail
                            }
                            type
                        }
                    }
                }
            `;

            try {
                const gqlFetch = new FetchBuilder()
                    .setUrl(`${address.backend}/api/graph`)
                    .setPayload(query)
                    .setIsGraphQLEndpoint(true)
                    .build();

                const response = await gqlFetch.exec();

                if (!response.content) {
                    setCourses([]);
                    setCoursesLoading(false);
                    return;
                }

                const items = (response.content as ContentItem[]).map(
                    (item) => {
                        const totalLessons = item.entity.totalLessons || 0;
                        const completed =
                            item.entity.completedLessonsCount || 0;
                        const completionPercentage =
                            totalLessons > 0
                                ? Math.round((completed / totalLessons) * 100)
                                : 0;

                        return {
                            id: item.entity.id,
                            title: item.entity.title,
                            slug: item.entity.slug,
                            type: item.entityType.toLowerCase(),
                            totalLessons,
                            completedLessons: completed,
                            completionPercentage,
                            imageUrl: item.entity.featuredImage?.thumbnail,
                        } as UserCourse;
                    },
                );

                setCourses(items.filter((item) => item.type === "course"));
            } catch {
                setCourses([]);
            } finally {
                setCoursesLoading(false);
            }
        };

        loadCourses();
    }, [address.backend, profile]);

    const updateProfilePic = async (media?: Media) => {
        const mutation = `
          mutation ($id: ID!, $avatar: MediaInput) {
            user: updateUser(userData: {
              id: $id
              avatar: $avatar
            }) {
                avatar {
                    mediaId,
                    originalFileName,
                    mimeType,
                    size,
                    access,
                    file,
                    thumbnail,
                    caption
                }
            }
          }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    id: profile!.userId,
                    avatar: media || null,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.user) {
                setProfile({
                    ...profile!,
                    avatar: response.user.avatar,
                });
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    };

    const saveDetails = async (e: FormEvent) => {
        e.preventDefault();

        setIsSaving(true);
        const mutation = `
          mutation ($id: ID!, $name: String, $bio: String) {
            user: updateUser(userData: {
              id: $id
              name: $name
              bio: $bio
            }) {
                id,
                name,
                userId,
                email,
                permissions,
                purchases {
                    courseId
                    completedLessons
                    accessibleGroups
                    certificateId
                },
                bio,
                avatar {
                    mediaId,
                    originalFileName,
                    mimeType,
                    size,
                    access,
                    file,
                    thumbnail,
                    caption
                }
            }
          }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    id: profile!.userId,
                    name,
                    bio,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            const response = await fetch.exec();
            if (response.user) {
                setProfile(response.user);
                initialDetailsRef.current = {
                    name,
                    bio,
                };
            }
        } catch (err: any) {
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setIsSaving(false);
        }
    };

    const saveEmailPreference = async function (state: boolean) {
        setSubscribedToUpdates(state);
        const mutation = `
          mutation ($id: ID!, $subscribedToUpdates: Boolean) {
            user: updateUser(userData: {
              id: $id
              subscribedToUpdates: $subscribedToUpdates 
            }) {
                subscribedToUpdates
            }
          }
        `;
        const fetch = new FetchBuilder()
            .setUrl(`${address.backend}/api/graph`)
            .setPayload({
                query: mutation,
                variables: {
                    id: profile!.userId,
                    subscribedToUpdates: state,
                },
            })
            .setIsGraphQLEndpoint(true)
            .build();

        try {
            await fetch.exec();
        } catch (err: any) {
            setSubscribedToUpdates(!state);
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        }
    };

    const isSaveDisabled =
        name === initialDetailsRef.current.name &&
        bio === initialDetailsRef.current.bio;

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <h1 className="text-4xl font-semibold mb-2">
                {PROFILE_PAGE_HEADER}
            </h1>
            <div className="flex flex-col lg:flex-row gap-4">
                <Card className="w-full lg:w-2/6">
                    <CardHeader>
                        <CardTitle>{PROFILE_SECTION_DISPLAY_PICTURE}</CardTitle>
                    </CardHeader>
                    <CardContent className="flex flex-col items-center gap-4">
                        <Avatar className="w-40 h-40">
                            <AvatarImage src={avatar?.file} />
                            <AvatarFallback>
                                <Image
                                    src="/courselit_backdrop_square.webp"
                                    alt="profile pic"
                                    sizes="16vw"
                                    height="h-40"
                                    width="w-40"
                                />
                            </AvatarFallback>
                        </Avatar>
                        <MediaSelector
                            title=""
                            profile={profile as Profile}
                            address={address}
                            mediaId={avatar?.mediaId}
                            src={avatar?.thumbnail || ""}
                            srcTitle={avatar?.originalFileName || ""}
                            onSelection={(media?: Media) => {
                                if (media) {
                                    updateProfilePic(media);
                                }
                            }}
                            onRemove={() => {
                                updateProfilePic();
                            }}
                            access="public"
                            strings={{
                                buttonCaption:
                                    MEDIA_SELECTOR_UPLOAD_BTN_CAPTION,
                                removeButtonCaption:
                                    MEDIA_SELECTOR_REMOVE_BTN_CAPTION,
                            }}
                            type="user"
                            hidePreview={true}
                            mimeTypesToShow={MIMETYPE_IMAGE}
                        />
                    </CardContent>
                </Card>
                <Card className="w-full lg:w-4/6">
                    <form onSubmit={saveDetails}>
                        <CardHeader>
                            <CardTitle>{PROFILE_SECTION_DETAILS}</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <FieldSet>
                                <FieldGroup>
                                    <Field>
                                        <FieldLabel htmlFor="profile-email">
                                            {PROFILE_SECTION_DETAILS_EMAIL}
                                        </FieldLabel>
                                        <Input
                                            id="profile-email"
                                            value={profile?.email ?? ""}
                                            disabled
                                            readOnly
                                            aria-readonly
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="profile-name">
                                            {PROFILE_SECTION_DETAILS_NAME}
                                        </FieldLabel>
                                        <Input
                                            id="profile-name"
                                            value={name}
                                            onChange={(event) =>
                                                setName(event.target.value)
                                            }
                                            required
                                        />
                                    </Field>
                                    <Field>
                                        <FieldLabel htmlFor="profile-bio">
                                            {PROFILE_SECTION_DETAILS_BIO}
                                        </FieldLabel>
                                        <Textarea
                                            id="profile-bio"
                                            value={bio}
                                            onChange={(event) =>
                                                setBio(event.target.value)
                                            }
                                        />
                                    </Field>
                                </FieldGroup>
                            </FieldSet>
                            <div className="flex justify-end">
                                <Button
                                    type="submit"
                                    disabled={isSaveDisabled || isSaving}
                                >
                                    {isSaving ? BUTTON_SAVING : BUTTON_SAVE}
                                </Button>
                            </div>
                        </CardContent>
                    </form>
                </Card>
            </div>
            {/* <Card className="mt-4">
                <CardHeader>
                    <CardTitle>{PROFILE_EMAIL_PREFERENCES}</CardTitle>
                </CardHeader>
                <CardContent>
                    <FieldSet>
                        <FieldLegend className="sr-only" variant="label">
                            {PROFILE_EMAIL_PREFERENCES}
                        </FieldLegend>
                        <FieldGroup>
                            <Field
                                orientation="horizontal"
                                className="items-center justify-between"
                            >
                                <FieldContent>
                                    <FieldLabel>
                                        {
                                            PROFILE_EMAIL_PREFERENCES_NEWSLETTER_OPTION_TEXT
                                        }
                                    </FieldLabel>
                                </FieldContent>
                                <Checkbox
                                    checked={subscribedToUpdates}
                                    onChange={(
                                        value: boolean | "indeterminate",
                                    ) => saveEmailPreference(value === true)}
                                />
                            </Field>
                        </FieldGroup>
                    </FieldSet>
                </CardContent>
            </Card> */}
            <Card className="mt-4">
                <CardHeader>
                    <CardTitle>{ENROLLED_COURSES_HEADER}</CardTitle>
                </CardHeader>
                <CardContent>
                    {coursesLoading ? (
                        <div className="space-y-3">
                            <div className="h-16 rounded-lg bg-muted/60 animate-pulse" />
                            <div className="h-16 rounded-lg bg-muted/60 animate-pulse" />
                        </div>
                    ) : courses.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                            You haven&apos;t enrolled in any courses yet. Your
                            learning progress will appear here.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {courses.map((course) => (
                                <div
                                    key={course.id}
                                    className="flex gap-3 rounded-xl border border-border/80 bg-card/70 p-3"
                                >
                                    {course.imageUrl && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img
                                            src={course.imageUrl}
                                            alt={course.title}
                                            className="h-14 w-20 rounded-md object-cover border border-border/60"
                                        />
                                    )}
                                    <div className="flex-1 space-y-1">
                                        <p className="text-sm font-medium text-foreground line-clamp-2">
                                            {course.title}
                                        </p>
                                        <div className="flex items-center justify-between text-[0.7rem] text-muted-foreground">
                                            <span>
                                                {course.completedLessons}/
                                                {course.totalLessons} lessons
                                            </span>
                                            <span className="font-semibold text-primary">
                                                {course.completionPercentage}%
                                            </span>
                                        </div>
                                        <ProgressBar
                                            value={course.completionPercentage}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </DashboardContent>
    );
}
