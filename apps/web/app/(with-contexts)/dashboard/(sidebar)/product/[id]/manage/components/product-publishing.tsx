"use client";

import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@courselit/components-library";
import {
    APP_MESSAGE_COURSE_SAVED,
    TOAST_TITLE_ERROR,
    TOAST_TITLE_SUCCESS,
} from "@ui-config/strings";
import { useGraphQLFetch } from "@/hooks/use-graphql-fetch";

const MUTATION_UPDATE_PUBLISHED = `
    mutation UpdatePublished($courseId: String!, $published: Boolean!, $privacy: CoursePrivacyType) {
        updateCourse(courseData: { id: $courseId, published: $published, privacy: $privacy }) {
            courseId
        }
    }
`;

interface ProductPublishingProps {
    product: any;
}

export default function ProductPublishing({ product }: ProductPublishingProps) {
    const { toast } = useToast();
    const fetch = useGraphQLFetch();
    const [loading, setLoading] = useState(false);
    const [isPublished, setIsPublished] = useState(product?.published || false);
    const handlePublishedChange = async () => {
        const newValue = !isPublished;
        const previousValue = isPublished;
        setIsPublished(newValue);

        if (!product?.courseId) return;

        try {
            setLoading(true);
            const response = await fetch
                .setPayload({
                    query: MUTATION_UPDATE_PUBLISHED,
                    variables: {
                        courseId: product.courseId,
                        published: newValue,
                        // When publishing, always switch privacy to PUBLIC so the
                        // product is visible in the catalog. When unpublishing,
                        // leave privacy unchanged.
                        privacy: newValue ? "PUBLIC" : undefined,
                    },
                })
                .build()
                .exec();

            if (response?.updateCourse) {
                toast({
                    title: TOAST_TITLE_SUCCESS,
                    description: APP_MESSAGE_COURSE_SAVED,
                });
            }
        } catch (err: any) {
            // Revert to previous state on error
            setIsPublished(previousValue);
            toast({
                title: TOAST_TITLE_ERROR,
                description: err.message,
                variant: "destructive",
            });
        } finally {
            setLoading(false);
        }
    };

    // Visibility toggle is intentionally disabled (no-op) to avoid courses
    // accidentally becoming UNLISTED. All published products remain PUBLIC.
    const handlePrivacyChange = async () => {
        return;
    };

    return (
        <div className="space-y-8">
            <div className="space-y-6" id="publish">
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <Label className="text-base font-semibold">
                            Published
                        </Label>
                        <p className="text-sm text-muted-foreground">
                            Make this course available to students
                        </p>
                    </div>
                    <Switch
                        checked={isPublished}
                        onCheckedChange={handlePublishedChange}
                        disabled={loading}
                    />
                </div>
                {/* Visibility toggle disabled for now to prevent accidental UNLISTED privacy */}
            </div>
            <Separator />
        </div>
    );
}
