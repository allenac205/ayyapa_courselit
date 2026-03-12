"use client";

import { useContext, useState } from "react";
import DashboardContent from "@components/admin/dashboard-content";
import { AI_QUIZ_HEADER } from "@ui-config/strings";
import { AddressContext, ProfileContext } from "@components/contexts";
import type { ContentItem } from "@/components/admin/my-content/content";
import { FetchBuilder } from "@courselit/utils";
import Link from "next/link";

type QuizQuestion = {
    question: string;
    options: string[];
    correct_option_index: number;
    explanation: string;
};

type QuizResponse = {
    quiz_title: string;
    questions: QuizQuestion[];
    overall_comment: string;
};

type QuizState = {
    answers: Record<number, number | null>;
    submitted: boolean;
    score: number;
    total: number;
};

const breadcrumbs = [{ label: AI_QUIZ_HEADER, href: "#" }];

export default function Page() {
    const { profile } = useContext(ProfileContext);
    const address = useContext(AddressContext);
    const [isLoading, setIsLoading] = useState(false);
    const [quiz, setQuiz] = useState<QuizResponse | null>(null);
    const [quizState, setQuizState] = useState<QuizState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [hasStarted, setHasStarted] = useState(false);

    const loadQuiz = async () => {
        if (!profile) {
            return;
        }

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

            const items = (response.content as ContentItem[]).map((item) => {
                const totalLessons = item.entity.totalLessons || 0;
                const completed = item.entity.completedLessonsCount || 0;
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
                };
            });

            const payload = {
                user: {
                    id: (profile as any).userId ?? profile.userId,
                    email: profile.email,
                    name: profile.name,
                },
                products: items,
            };

            const quizResponse = await window.fetch("/api/ai/quiz", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const quizJson = (await quizResponse.json()) as {
                ok: boolean;
                data?: QuizResponse;
                error?: string;
            };

            if (quizJson.ok && quizJson.data) {
                setQuiz(quizJson.data);
                setQuizState({
                    answers: {},
                    submitted: false,
                    score: 0,
                    total: quizJson.data.questions.length,
                });
            } else if (quizJson.error) {
                setError(quizJson.error);
            } else {
                setError("Could not fetch AI quiz.");
            }
        } catch {
            setError("Failed to contact AI quiz service.");
        }

        setIsLoading(false);
    };

    const handleAnswer = (questionIndex: number, optionIndex: number) => {
        setQuizState((prev) =>
            prev
                ? {
                      ...prev,
                      answers: {
                          ...prev.answers,
                          [questionIndex]: optionIndex,
                      },
                  }
                : prev,
        );
    };

    const handleSubmit = () => {
        if (!quiz || !quizState) return;

        let score = 0;
        quiz.questions.forEach((q, index) => {
            if (quizState.answers[index] === q.correct_option_index) {
                score += 1;
            }
        });

        setQuizState((prev) =>
            prev
                ? {
                      ...prev,
                      submitted: true,
                      score,
                  }
                : prev,
        );
    };

    const completionRate =
        quizState && quizState.total > 0
            ? Math.round((quizState.score / quizState.total) * 100)
            : 0;

    const performanceTheme =
        completionRate >= 80 ? "high" : completionRate >= 50 ? "medium" : "low";

    return (
        <DashboardContent breadcrumbs={breadcrumbs}>
            <div className="space-y-4">
                <h1 className="text-4xl font-semibold">{AI_QUIZ_HEADER}</h1>
                <p className="text-sm text-muted-foreground">
                    Take an AI-generated quiz based on your current learning
                    journey.
                </p>
                {error && !isLoading && (
                    <p className="text-sm text-destructive">{error}</p>
                )}
            </div>
            {!hasStarted && !quiz && !isLoading && (
                <div className="mt-10 flex flex-col items-center justify-center">
                    <div className="relative overflow-hidden rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/30 via-background to-background px-10 py-12 text-center max-w-xl w-full shadow-[0_0_60px_rgba(59,130,246,0.45)]">
                        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary-foreground/80">
                            Ready for a challenge?
                        </p>
                        <h2 className="mt-4 text-2xl md:text-3xl font-semibold">
                            Start your AI-powered quiz adventure
                        </h2>
                        <p className="mt-3 text-sm text-muted-foreground">
                            We&apos;ll generate a quick quiz based on the
                            courses you&apos;re currently taking. Hit start to
                            see how much you remember.
                        </p>
                        <button
                            type="button"
                            onClick={() => {
                                setHasStarted(true);
                                loadQuiz();
                            }}
                            className="mt-8 inline-flex items-center justify-center rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/40 hover:scale-[1.02] transition-transform"
                        >
                            Start quiz
                        </button>
                    </div>
                </div>
            )}

            {isLoading && !quiz && (
                <div className="mt-10 flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 rounded-3xl border border-border bg-card/70 px-8 py-10">
                        <div className="h-10 w-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                        <p className="text-sm text-muted-foreground">
                            Summoning your personalized quiz…
                        </p>
                    </div>
                </div>
            )}

            {quiz && quizState && !isLoading && (
                <div className="mt-6 space-y-8">
                    {/* Hero: quiz title and score badge */}
                    <div className="grid gap-6 md:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
                        <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-primary/20 via-background to-background p-6 md:p-8">
                            <div className="space-y-3">
                                <p className="text-xs font-medium uppercase tracking-[0.2em] text-primary">
                                    AI powered challenge
                                </p>
                                <h2 className="text-xl md:text-2xl font-semibold">
                                    {quiz.quiz_title}
                                </h2>
                                <p className="text-sm text-muted-foreground max-w-xl">
                                    {quiz.overall_comment}
                                </p>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-border bg-card/80 p-6 flex flex-col items-center justify-center gap-4">
                            <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                                Quiz score
                            </p>
                            <div className="relative flex items-center justify-center">
                                <div
                                    className={`h-24 w-24 md:h-32 md:w-32 rounded-full flex items-center justify-center transition-all duration-500 ${
                                        performanceTheme === "high"
                                            ? "bg-emerald-500/20 border border-emerald-400/70 shadow-[0_0_40px_rgba(16,185,129,0.9)]"
                                            : performanceTheme === "medium"
                                              ? "bg-amber-500/20 border border-amber-400/70 shadow-[0_0_40px_rgba(245,158,11,0.9)]"
                                              : "bg-rose-500/20 border border-rose-400/70 shadow-[0_0_40px_rgba(244,63,94,0.9)]"
                                    }`}
                                >
                                    <div
                                        className={`h-20 w-20 md:h-28 md:w-28 rounded-full bg-background flex flex-col items-center justify-center border text-center transition-all duration-500 ${
                                            performanceTheme === "high"
                                                ? "border-emerald-400"
                                                : performanceTheme === "medium"
                                                  ? "border-amber-300"
                                                  : "border-rose-400"
                                        }`}
                                    >
                                        <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                                            {quizState.submitted
                                                ? "Your score"
                                                : "Ready"}
                                        </span>
                                        <span
                                            className={`text-3xl md:text-4xl font-extrabold ${
                                                performanceTheme === "high"
                                                    ? "text-emerald-400"
                                                    : performanceTheme ===
                                                        "medium"
                                                      ? "text-amber-300"
                                                      : "text-rose-400"
                                            }`}
                                        >
                                            {quizState.submitted
                                                ? quizState.score
                                                : quizState.total}
                                        </span>
                                        <span className="text-[0.75rem] text-muted-foreground">
                                            /{quizState.total}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {quizState.submitted && (
                                <div
                                    className={`mt-2 rounded-full px-4 py-2 text-xs font-medium border text-center ${
                                        performanceTheme === "high"
                                            ? "bg-emerald-500/15 text-emerald-200 border-emerald-400/70"
                                            : performanceTheme === "medium"
                                              ? "bg-amber-500/15 text-amber-100 border-amber-400/70"
                                              : "bg-rose-500/15 text-rose-100 border-rose-400/70"
                                    }`}
                                >
                                    You answered {completionRate}% questions
                                    correctly.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Questions */}
                    <div className="space-y-4">
                        {quiz.questions.map((q, index) => {
                            const selected = quizState.answers[index];
                            const isCorrect =
                                quizState.submitted &&
                                selected === q.correct_option_index;
                            const hasAnswered =
                                quizState.submitted && selected !== undefined;

                            return (
                                <div
                                    key={index}
                                    className="rounded-2xl border border-border bg-card/70 p-5 space-y-4"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="space-y-1">
                                            <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
                                                Question {index + 1}
                                            </p>
                                            <p className="text-sm md:text-base font-medium text-foreground">
                                                {q.question}
                                            </p>
                                        </div>
                                        {quizState.submitted && (
                                            <span
                                                className={`rounded-full px-3 py-1 text-xs font-medium ${
                                                    isCorrect
                                                        ? "bg-emerald-500/15 text-emerald-300 border border-emerald-400/60"
                                                        : "bg-rose-500/10 text-rose-300 border border-rose-400/50"
                                                }`}
                                            >
                                                {isCorrect
                                                    ? "Correct"
                                                    : "Review"}
                                            </span>
                                        )}
                                    </div>

                                    <div className="grid gap-2">
                                        {q.options.map(
                                            (option, optionIndex) => {
                                                const isSelected =
                                                    selected === optionIndex;
                                                const isRightOption =
                                                    optionIndex ===
                                                    q.correct_option_index;

                                                let optionClasses =
                                                    "rounded-xl border bg-background/60 px-4 py-3 text-sm text-left transition-colors cursor-pointer";

                                                if (!quizState.submitted) {
                                                    optionClasses += isSelected
                                                        ? " border-primary bg-primary/10 text-foreground"
                                                        : " border-border hover:border-primary/60 hover:bg-primary/5";
                                                } else {
                                                    if (isRightOption) {
                                                        optionClasses +=
                                                            " border-emerald-400 bg-emerald-500/10";
                                                    } else if (isSelected) {
                                                        optionClasses +=
                                                            " border-rose-400 bg-rose-500/10";
                                                    } else {
                                                        optionClasses +=
                                                            " border-border/60 bg-background/40";
                                                    }
                                                }

                                                return (
                                                    <button
                                                        key={optionIndex}
                                                        type="button"
                                                        disabled={
                                                            quizState.submitted
                                                        }
                                                        onClick={() =>
                                                            handleAnswer(
                                                                index,
                                                                optionIndex,
                                                            )
                                                        }
                                                        className={
                                                            optionClasses
                                                        }
                                                    >
                                                        <span className="flex items-center justify-between gap-3">
                                                            <span>
                                                                {option}
                                                            </span>
                                                            {!quizState.submitted &&
                                                                isSelected && (
                                                                    <span className="text-xs text-primary">
                                                                        Selected
                                                                    </span>
                                                                )}
                                                        </span>
                                                    </button>
                                                );
                                            },
                                        )}
                                    </div>

                                    {quizState.submitted && (
                                        <p className="text-xs text-muted-foreground border-t border-border/60 pt-3">
                                            {q.explanation}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-muted-foreground">
                            Answer all questions, then submit to see your score
                            and explanations.
                        </p>
                        <div className="flex items-center gap-2">
                            <Link href="/dashboard/my-content">
                                <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-full border border-border bg-background/60 px-4 py-2 text-sm font-medium text-muted-foreground hover:border-primary/60 hover:text-primary transition-colors"
                                >
                                    Exit to My content
                                </button>
                            </Link>
                            <button
                                type="button"
                                disabled={
                                    !quiz.questions.length ||
                                    quizState.submitted ||
                                    Object.keys(quizState.answers).length <
                                        quiz.questions.length
                                }
                                onClick={handleSubmit}
                                className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2 text-sm font-medium text-primary-foreground shadow-lg shadow-primary/40 disabled:cursor-not-allowed disabled:bg-primary/40"
                            >
                                {quizState.submitted
                                    ? "Quiz Completed"
                                    : "Submit quiz"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </DashboardContent>
    );
}
