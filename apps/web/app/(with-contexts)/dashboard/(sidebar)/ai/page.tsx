"use client";

import { useContext, useEffect, useState } from "react";
import DashboardContent from "@components/admin/dashboard-content";
import {
    AI_DASHBOARD_HEADER,
    CREATIVE_LEARNING_HEADER,
} from "@ui-config/strings";
import { AddressContext, ProfileContext } from "@components/contexts";
import type { ContentItem } from "@/components/admin/my-content/content";
import { ProgressBar } from "@components/admin/my-content/progress-bar";
import { FetchBuilder } from "@courselit/utils";

type RecommendedCourse = {
    title: string;
    description: string;
};

type YoutubeResource = {
    title: string;
    search_query: string;
    search_url: string;
};

type LearningSuggestions = {
    overall_comment: string;
    completion_rating_out_of_10: number;
    course_summaries: string[];
    recommended_courses: RecommendedCourse[];
    youtube_resources: YoutubeResource[];
    extra_tips: string[];
};

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

const breadcrumbs = [{ label: AI_DASHBOARD_HEADER, href: "#" }];

export default function Page() {
    const { profile } = useContext(ProfileContext);
    const address = useContext(AddressContext);
    const [isLoading, setIsLoading] = useState(false);
    const [suggestions, setSuggestions] = useState<LearningSuggestions | null>(
        null,
    );
    const [courses, setCourses] = useState<UserCourse[]>([]);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!profile) {
            return;
        }

        const loadSuggestions = async () => {
            setIsLoading(true);
            setError(null);

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
                    setIsLoading(false);
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

                const payload = {
                    user: {
                        id: (profile as any).userId ?? profile.userId,
                        email: profile.email,
                        name: profile.name,
                    },
                    products: items,
                };

                const aiResponse = await window.fetch(
                    "/api/ai/log-user-content",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify(payload),
                    },
                );

                const aiJson = (await aiResponse.json()) as {
                    ok: boolean;
                    data?: LearningSuggestions;
                    error?: string;
                };

                if (aiJson.ok && aiJson.data) {
                    setSuggestions(aiJson.data);
                } else if (aiJson.error) {
                    setError(aiJson.error);
                } else {
                    setError("Could not fetch learning suggestions.");
                }
            } catch {
                setError("Failed to contact learning suggestions service.");
            }

            setIsLoading(false);
        };

        loadSuggestions();
    }, [address.backend, profile]);

    const totalCourses = courses.length;
    const completedCourses = courses.filter(
        (course) => course.completionPercentage >= 100,
    ).length;
    const averageCompletion =
        courses.length > 0
            ? Math.round(
                  courses.reduce(
                      (sum, course) => sum + course.completionPercentage,
                      0,
                  ) / courses.length,
              )
            : 0;
    const totalCompletedLessons = courses.reduce(
        (sum, course) => sum + course.completedLessons,
        0,
    );

    const ratingScore = suggestions?.completion_rating_out_of_10 ?? 0;
    const ratingTheme =
        ratingScore >= 8 ? "high" : ratingScore >= 5 ? "medium" : "low";

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="space-y-4">
                <h1 className="text-4xl font-semibold">
                    {CREATIVE_LEARNING_HEADER}
                </h1>
                <p className="text-sm text-muted-foreground">
                    This page summarizes your learning journey and prepares data
                    for future AI-powered suggestions.
                </p>
                {error && !isLoading && (
                    <p className="text-sm text-destructive">{error}</p>
                )}
            </div>

            {isLoading && !suggestions && (
                <div className="mt-10 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card/70 px-8 py-10">
                        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">
                            Talking to AI engine to analyze your learning…
                        </p>
                    </div>
                </div>
            )}

            {suggestions && !isLoading && (
                <div className="mt-6 space-y-8">
                    {/* Hero stats row */}
                    <div className="grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
                        {/* Big score card */}
                        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/15 via-background to-background p-6 md:p-8">
                            <div className="flex items-start justify-between gap-4">
                                <div className="space-y-2">
                                    <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
                                        Your learning score
                                    </p>
                                    <h2 className="text-xl md:text-2xl font-semibold">
                                        You&apos;re leveling up fast!
                                    </h2>
                                    <p className="text-sm text-muted-foreground max-w-md">
                                        {suggestions.overall_comment}
                                    </p>
                                </div>
                                <div className="relative flex items-center justify-center">
                                    <div
                                        className={`h-24 w-24 md:h-32 md:w-32 rounded-full flex items-center justify-center transition-all duration-500 ${
                                            ratingTheme === "high"
                                                ? "bg-emerald-500/20 border border-emerald-400/70 shadow-[0_0_40px_rgba(16,185,129,0.8)]"
                                                : ratingTheme === "medium"
                                                  ? "bg-amber-500/20 border border-amber-400/70 shadow-[0_0_40px_rgba(245,158,11,0.8)]"
                                                  : "bg-rose-500/20 border border-rose-400/70 shadow-[0_0_40px_rgba(244,63,94,0.8)]"
                                        }`}
                                    >
                                        <div
                                            className={`h-20 w-20 md:h-28 md:w-28 rounded-full bg-background flex flex-col items-center justify-center border text-center transition-all duration-500 ${
                                                ratingTheme === "high"
                                                    ? "border-emerald-400"
                                                    : ratingTheme === "medium"
                                                      ? "border-amber-300"
                                                      : "border-rose-400"
                                            }`}
                                        >
                                            <span className="text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">
                                                Rating
                                            </span>
                                            <span
                                                className={`text-3xl md:text-4xl font-extrabold ${
                                                    ratingTheme === "high"
                                                        ? "text-emerald-400"
                                                        : ratingTheme ===
                                                            "medium"
                                                          ? "text-amber-300"
                                                          : "text-rose-400"
                                                }`}
                                            >
                                                {ratingScore}
                                            </span>
                                            <span className="text-[0.7rem] text-muted-foreground">
                                                /10
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 grid gap-3 sm:grid-cols-3 text-xs md:text-sm">
                                <div className="rounded-xl border border-primary/20 bg-background/60 px-4 py-3">
                                    <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                                        Enrolled courses
                                    </p>
                                    <p className="mt-1 text-lg font-semibold">
                                        {totalCourses}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-primary/20 bg-background/60 px-4 py-3">
                                    <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                                        Courses mastered
                                    </p>
                                    <p className="mt-1 text-lg font-semibold">
                                        {completedCourses}
                                    </p>
                                </div>
                                <div className="rounded-xl border border-primary/20 bg-background/60 px-4 py-3">
                                    <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                                        Lessons completed
                                    </p>
                                    <p className="mt-1 text-lg font-semibold">
                                        {totalCompletedLessons}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Course insights & streak-style stats */}
                        <div className="space-y-4">
                            <div className="rounded-2xl border border-border bg-card/70 p-5 space-y-3">
                                <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                                    Course insights
                                </h3>
                                <ul className="space-y-2 text-sm text-muted-foreground">
                                    {suggestions.course_summaries.map(
                                        (summary, idx) => (
                                            <li
                                                key={idx}
                                                className="flex gap-2 leading-relaxed"
                                            >
                                                <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary" />
                                                <span>{summary}</span>
                                            </li>
                                        ),
                                    )}
                                </ul>
                            </div>

                            <div className="grid gap-3 sm:grid-cols-3 text-xs md:text-sm">
                                <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
                                    <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                                        Average completion
                                    </p>
                                    <p className="mt-1 text-lg font-semibold">
                                        {averageCompletion}%
                                    </p>
                                    <p className="text-[0.7rem] text-muted-foreground">
                                        Keep pushing towards 100%.
                                    </p>
                                </div>
                                <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
                                    <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                                        Active journey
                                    </p>
                                    <p className="mt-1 text-lg font-semibold">
                                        {
                                            courses.filter(
                                                (c) =>
                                                    c.completionPercentage >
                                                        0 &&
                                                    c.completionPercentage <
                                                        100,
                                            ).length
                                        }{" "}
                                        ongoing
                                    </p>
                                    <p className="text-[0.7rem] text-muted-foreground">
                                        Stay consistent to keep momentum.
                                    </p>
                                </div>
                                <div className="rounded-xl border border-border bg-background/60 px-4 py-3">
                                    <p className="text-[0.65rem] uppercase tracking-[0.2em] text-muted-foreground">
                                        Progress tier
                                    </p>
                                    <p className="mt-1 text-lg font-semibold">
                                        {suggestions.completion_rating_out_of_10 >=
                                        8
                                            ? "Expert"
                                            : suggestions.completion_rating_out_of_10 >=
                                                5
                                              ? "Explorer"
                                              : "Starter"}
                                    </p>
                                    <p className="text-[0.7rem] text-muted-foreground">
                                        Based on your current rating.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Middle row: current courses + recommendations */}
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                        {/* Current courses */}
                        <div className="rounded-2xl border border-border bg-card/70 p-6 space-y-4">
                            <div className="flex items-center justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                                        Current courses
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Track how close you are to finishing
                                        each course.
                                    </p>
                                </div>
                                <span className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-[0.7rem] font-medium text-primary">
                                    {completedCourses} completed ·{" "}
                                    {totalCourses - completedCourses} in
                                    progress
                                </span>
                            </div>

                            {courses.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    You haven&apos;t enrolled in any courses
                                    yet. Start a course to begin your journey.
                                </p>
                            ) : (
                                <div className="space-y-3 max-h-[320px] overflow-y-auto pr-1">
                                    {courses.map((course) => (
                                        <div
                                            key={course.id}
                                            className="flex gap-3 rounded-xl border border-border/80 bg-background/60 p-3 hover:border-primary/50 transition-colors"
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
                                                        {
                                                            course.completedLessons
                                                        }
                                                        /{course.totalLessons}{" "}
                                                        lessons
                                                    </span>
                                                    <span className="font-semibold text-primary">
                                                        {
                                                            course.completionPercentage
                                                        }
                                                        %
                                                    </span>
                                                </div>
                                                <ProgressBar
                                                    value={
                                                        course.completionPercentage
                                                    }
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Recommended next courses */}
                        <div className="rounded-2xl border border-border bg-card/70 p-6 space-y-4">
                            <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                                Recommended next courses
                            </h3>
                            <div className="space-y-3">
                                {suggestions.recommended_courses.map(
                                    (course, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded-xl border border-border/80 bg-background/60 p-4 hover:border-primary/50 transition-colors"
                                        >
                                            <p className="text-sm font-semibold text-foreground">
                                                {course.title}
                                            </p>
                                            <p className="mt-1 text-xs text-muted-foreground leading-relaxed">
                                                {course.description}
                                            </p>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Bottom row: resources & tips */}
                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="rounded-2xl border border-border bg-card/70 p-6 space-y-4">
                            <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                                Videos & resources
                            </h3>
                            <div className="space-y-3">
                                {suggestions.youtube_resources.map(
                                    (resource, idx) => (
                                        <div
                                            key={idx}
                                            className="rounded-xl border border-border/80 bg-background/60 p-4 hover:border-primary/50 transition-colors"
                                        >
                                            <p className="text-sm font-semibold text-foreground line-clamp-2">
                                                {resource.title}
                                            </p>
                                            <a
                                                href={resource.search_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-1 inline-block text-xs text-primary hover:underline break-all"
                                            >
                                                {resource.search_query}
                                            </a>
                                        </div>
                                    ),
                                )}
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-card/70 p-6 space-y-4">
                            <h3 className="text-sm font-semibold tracking-wide text-muted-foreground uppercase">
                                Extra tips
                            </h3>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                {suggestions.extra_tips.map((tip, idx) => (
                                    <li
                                        key={idx}
                                        className="flex gap-2 leading-relaxed"
                                    >
                                        <span className="mt-1 h-1.5 w-1.5 rounded-full bg-accent" />
                                        <span>{tip}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </DashboardContent>
    );
}
