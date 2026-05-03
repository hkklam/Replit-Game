import { useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, ChevronRight, BookOpen } from "lucide-react";
import { GAMES } from "@/games/registry";
import { TUTOR_LESSONS, type GameLesson, type Concept } from "@/lib/tutor-content";

function GameSelector({ onSelect }: { onSelect: (lesson: GameLesson) => void }) {
  const gamesWithLessons = GAMES.filter((g) => TUTOR_LESSONS[g.id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-950/40 to-transparent sticky top-0 z-10">
        <Link
          href="/"
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-sm transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Menu</span>
        </Link>
        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-300 via-yellow-300 to-amber-400">
          📚 Programming Tutor
        </h1>
      </header>

      <main className="flex-1 p-6 overflow-auto">
        <div className="max-w-6xl mx-auto">
          <div className="mb-8">
            <p className="text-lg text-slate-300 mb-2">
              Learn the programming concepts behind Harry's Game Hub games!
            </p>
            <p className="text-sm text-slate-400">
              Select a game to explore its unique programming techniques, code examples, and interactive quizzes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {gamesWithLessons.map((game) => {
              const lesson = TUTOR_LESSONS[game.id];
              return (
                <button
                  key={game.id}
                  onClick={() => onSelect(lesson)}
                  className="group relative overflow-hidden rounded-xl border border-white/10 bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-6 hover:border-amber-400/50 hover:from-slate-800 hover:to-slate-800/80 transition-all hover:shadow-lg hover:shadow-amber-500/10"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 via-amber-500/0 to-amber-500/5 group-hover:from-amber-500/5 group-hover:via-amber-500/5 group-hover:to-amber-500/10 transition-all" />
                  <div className="relative">
                    <div className="text-4xl mb-3">{game.icon}</div>
                    <h3 className="text-lg font-bold text-white mb-2 group-hover:text-amber-300 transition-colors">
                      {game.name}
                    </h3>
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{game.desc}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-amber-400">
                        {lesson.uniqueConcepts.length} concepts
                      </span>
                      <ChevronRight className="h-4 w-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}

function ConceptExplorer({ concept }: { concept: Concept }) {
  const [expandedExample, setExpandedExample] = useState<number | null>(0);

  return (
    <div className="space-y-4 mb-6">
      <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-4">
        <div className="flex items-start gap-3 mb-3">
          <div className="text-2xl">💡</div>
          <div>
            <h4 className="text-lg font-bold text-amber-300">{concept.name}</h4>
            <span className="text-xs font-mono text-amber-400/70 mt-1 inline-block">
              {concept.difficulty.charAt(0).toUpperCase() + concept.difficulty.slice(1)}
            </span>
          </div>
        </div>
        <p className="text-sm text-slate-300 mb-3">{concept.description}</p>

        <div className="mb-3">
          <p className="text-xs text-slate-400 font-semibold mb-2">Common Uses:</p>
          <div className="flex flex-wrap gap-2">
            {concept.commonUse.map((use) => (
              <span
                key={use}
                className="px-2 py-1 text-xs rounded bg-slate-700/50 text-slate-300 border border-slate-600/50"
              >
                {use}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3">
        {concept.examples.map((example, idx) => (
          <div
            key={idx}
            className="rounded-lg border border-slate-700 bg-slate-800/40 overflow-hidden"
          >
            <button
              onClick={() => setExpandedExample(expandedExample === idx ? null : idx)}
              className="w-full px-4 py-3 flex items-center justify-between hover:bg-slate-700/20 transition-colors"
            >
              <div className="text-left">
                <h5 className="font-semibold text-slate-100">{example.title}</h5>
                <p className="text-xs text-slate-400 mt-1">{example.description}</p>
              </div>
              <div className={`text-slate-400 transition-transform ${expandedExample === idx ? "rotate-180" : ""}`}>
                ▼
              </div>
            </button>

            {expandedExample === idx && (
              <div className="px-4 py-3 bg-slate-900/60 border-t border-slate-700">
                <pre className="bg-slate-950 rounded p-3 overflow-x-auto text-xs text-slate-300 font-mono max-h-80 overflow-y-auto">
                  <code>{example.code}</code>
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function QuizSection({ questions }: { questions: any[] }) {
  const [currentQ, setCurrentQ] = useState(0);
  const [answered, setAnswered] = useState<boolean[]>(new Array(questions.length).fill(false));
  const [correct, setCorrect] = useState<boolean[]>(new Array(questions.length).fill(false));

  const q = questions[currentQ];
  const isAnswered = answered[currentQ];
  const isCorrect = correct[currentQ];

  const handleAnswer = (selected: number) => {
    if (isAnswered) return;

    const wasCorrect = selected === q.correctAnswer;
    const newAnswered = [...answered];
    const newCorrect = [...correct];

    newAnswered[currentQ] = true;
    newCorrect[currentQ] = wasCorrect;

    setAnswered(newAnswered);
    setCorrect(newCorrect);
  };

  const score = correct.filter((c) => c).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-lg font-bold text-white">
          Quiz: Test Your Understanding
        </h4>
        <span className="text-sm font-mono text-amber-400">
          {score} / {questions.length}
        </span>
      </div>

      <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-6">
        <p className="text-sm text-slate-400 mb-4">
          Question {currentQ + 1} of {questions.length}
        </p>

        <h3 className="text-lg font-semibold text-white mb-6">{q.question}</h3>

        <div className="space-y-2 mb-6">
          {q.options.map((option: string, idx: number) => (
            <button
              key={idx}
              onClick={() => handleAnswer(idx)}
              disabled={isAnswered}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                !isAnswered
                  ? "border-slate-600 bg-slate-800/50 hover:border-amber-400/50 hover:bg-slate-800 cursor-pointer"
                  : idx === q.correctAnswer
                    ? "border-green-500/50 bg-green-500/10 text-green-300"
                    : idx === (answered[currentQ] ? currentQ : -1) && !isCorrect
                      ? "border-red-500/50 bg-red-500/10 text-red-300"
                      : "border-slate-600 bg-slate-800/50 opacity-50"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="font-semibold">
                  {String.fromCharCode(65 + idx)}.
                </span>
                <span>{option}</span>
                {isAnswered && idx === q.correctAnswer && (
                  <span className="ml-auto text-green-400">✓</span>
                )}
                {isAnswered && idx !== q.correctAnswer && !isCorrect && (
                  <span className="ml-auto text-red-400">✗</span>
                )}
              </div>
            </button>
          ))}
        </div>

        {isAnswered && (
          <div
            className={`p-4 rounded-lg border ${
              isCorrect
                ? "border-green-500/30 bg-green-500/10 text-green-300"
                : "border-red-500/30 bg-red-500/10 text-red-300"
            }`}
          >
            <p className="text-sm font-semibold mb-2">
              {isCorrect ? "✓ Correct!" : "✗ Incorrect"}
            </p>
            <p className="text-xs">{q.explanation}</p>
          </div>
        )}

        <div className="flex gap-2 mt-6">
          <button
            onClick={() => setCurrentQ(Math.max(0, currentQ - 1))}
            disabled={currentQ === 0}
            className="px-4 py-2 rounded-lg border border-slate-600 hover:border-amber-400/50 disabled:opacity-50 text-sm font-semibold transition-colors"
          >
            ← Previous
          </button>

          {currentQ < questions.length - 1 && (
            <button
              onClick={() => setCurrentQ(Math.min(questions.length - 1, currentQ + 1))}
              className="ml-auto px-4 py-2 rounded-lg border border-slate-600 hover:border-amber-400/50 text-sm font-semibold transition-colors"
            >
              Next →
            </button>
          )}

          {currentQ === questions.length - 1 && (
            <div className="ml-auto text-sm font-semibold text-amber-300">
              Quiz Complete! Score: {score}/{questions.length}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function LessonView({
  lesson,
  onBack,
}: {
  lesson: GameLesson;
  onBack: () => void;
}) {
  const [expandedConcept, setExpandedConcept] = useState<string | null>(
    lesson.uniqueConcepts[0]?.id || null
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex flex-col">
      <header className="flex items-center gap-4 px-6 py-4 border-b border-amber-500/20 bg-gradient-to-r from-amber-950/40 to-transparent sticky top-0 z-10">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 text-white font-bold text-sm transition-all"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-3">
          <span className="text-3xl">{lesson.gameIcon}</span>
          <div>
            <h1 className="text-2xl font-black text-amber-300">{lesson.gameName}</h1>
            <p className="text-xs text-slate-400">Programming Concepts</p>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto p-6 space-y-8">
          <div className="rounded-lg border border-slate-700 bg-slate-800/40 p-6">
            <h2 className="text-lg font-bold text-amber-300 mb-3">About This Game</h2>
            <p className="text-slate-300 leading-relaxed">{lesson.summary}</p>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <BookOpen className="h-6 w-6 text-amber-400" />
              Unique Programming Concepts
            </h2>

            <div className="space-y-4">
              {lesson.uniqueConcepts.map((concept) => (
                <div key={concept.id}>
                  <button
                    onClick={() =>
                      setExpandedConcept(
                        expandedConcept === concept.id ? null : concept.id
                      )
                    }
                    className="w-full text-left px-4 py-3 rounded-lg border border-slate-700 bg-slate-800/40 hover:border-amber-400/50 hover:bg-slate-800/60 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white">{concept.name}</h3>
                        <p className="text-xs text-slate-400 mt-1">
                          {concept.description.substring(0, 80)}...
                        </p>
                      </div>
                      <div
                        className={`text-amber-400 transition-transform ${
                          expandedConcept === concept.id ? "rotate-180" : ""
                        }`}
                      >
                        ▼
                      </div>
                    </div>
                  </button>

                  {expandedConcept === concept.id && (
                    <div className="mt-2">
                      <ConceptExplorer concept={concept} />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {lesson.commonConcepts.length > 0 && (
            <div className="rounded-lg border border-slate-700/50 bg-slate-800/20 p-6">
              <h3 className="text-lg font-bold text-slate-300 mb-4">
                Common Technologies (Shared Across Games)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {lesson.commonConcepts.map((concept, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-3 p-3 rounded-lg bg-slate-900/40 border border-slate-700/50"
                  >
                    <span className="text-amber-400 mt-1">•</span>
                    <span className="text-sm text-slate-300">{concept}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <QuizSection questions={lesson.quiz} />

          <div className="pb-8" />
        </div>
      </main>
    </div>
  );
}

export default function Tutor() {
  const [selectedLesson, setSelectedLesson] = useState<GameLesson | null>(null);

  if (selectedLesson) {
    return (
      <LessonView
        lesson={selectedLesson}
        onBack={() => setSelectedLesson(null)}
      />
    );
  }

  return <GameSelector onSelect={setSelectedLesson} />;
}
