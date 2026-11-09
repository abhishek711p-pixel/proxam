"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  CalendarCheck,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  ExternalLink,
  FileText,
  Flag,
  Flame,
  Globe,
  Headphones,
  Home,
  LifeBuoy,
  Layers,
  LogOut,
  Menu,
  MessageCircleQuestion,
  Play,
  Plus,
  Presentation,
  RotateCcw,
  Send,
  Sparkles,
  Target,
  UserRound,
  Video,
  X,
} from "lucide-react";
import Logo from "@/components/Logo";
import Select from "@/components/Select";
import type { LearnData, LearnTask } from "@/lib/learn";
import NoticeBell from "@/components/NoticeBell";
import { lt, type TKey } from "./text";

type Tab = "home" | "roadmap" | "tests" | "doubts";
type Notify = (m: string) => void;
type T = ReturnType<typeof lt>;

const post = (url: string, body: unknown) =>
  fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) })
    .then((r) => r.json())
    .catch(() => null);

const MENTOR_KIND: Record<string, TKey> = { topic: "kTopic", questions: "kQuestions", revision: "kRevision", meet: "kMeet", other: "kOther" };
const kindText = (x: LearnTask, t: T) => (x.kind === "learn" ? t("kindLearn") : x.kind === "practice" ? t("kindPractice") : t(MENTOR_KIND[x.kind] || "kOther"));
const stepText = (x: LearnTask, t: T) => {
  if (x.kind === "learn") return t("learnStep");
  if (x.kind === "practice") return t("practiceStep");
  const n = x.mentor?.note;
  return n ? (n.length > 90 ? `${n.slice(0, 88)}...` : n) : `${t("fromMentor")}: ${kindText(x, t)}`;
};
const extLink = (href: string) => (href.startsWith("/") ? {} : { target: "_blank", rel: "noreferrer" });

/** A topic, question set, revision task or meeting the mentor added. */
function MentorModal({ task, t, isDone, toggle, close, askDoubt }: { task: LearnTask; t: T; isDone: boolean; toggle: () => void; close: () => void; askDoubt: () => void }) {
  const m = task.mentor!;
  const [shown, setShown] = useState<Record<number, boolean>>({});
  return (
    <div className="topic-modal-backdrop" onClick={close}>
      <section className="topic-modal" role="dialog" aria-modal="true" aria-labelledby="topic-modal-title" onClick={(e) => e.stopPropagation()}>
        <header className="topic-modal-header">
          <div>
            <p className="eyebrow">
              {t("fromMentor")} · {kindText(task, t)}
              {task.subjectKey && task.subject !== kindText(task, t) ? ` · ${task.subject}` : ""}
            </p>
            <h2 id="topic-modal-title">{task.title}</h2>
            <p>
              {task.dateLabel}
              {m.timeLabel ? `, ${m.timeLabel}` : ""} · {task.minutes} {t("min")}
              {m.questions?.length ? ` · ${t("questionsCount", { n: m.questions.length })}` : ""}
            </p>
          </div>
          <button className="topic-modal-close" aria-label={t("close")} onClick={close}>
            <X size={20} />
          </button>
        </header>

        {m.note && (
          <section className="resource-expanded">
            <p className="section-kicker">{t("mentorNote")}</p>
            <p style={{ whiteSpace: "pre-wrap", margin: 0 }}>{m.note}</p>
          </section>
        )}

        {m.questions && m.questions.length > 0 && (
          <section className="resource-expanded">
            <p className="section-kicker">{kindText(task, t)}</p>
            <p style={{ margin: "0 0 10px", color: "var(--muted)" }}>{t("solveThen")}</p>
            <ol className="dpp-questions mentor-questions">
              {m.questions.map((q, i) => (
                <li key={i}>
                  <span style={{ whiteSpace: "pre-wrap" }}>{q.q}</span>
                  {q.a && (
                    <>
                      <button className="text-button" onClick={() => setShown({ ...shown, [i]: !shown[i] })}>
                        {shown[i] ? t("hideAnswer") : t("showAnswer")}
                      </button>
                      {shown[i] && <em className="mentor-answer">{q.a}</em>}
                    </>
                  )}
                </li>
              ))}
            </ol>
          </section>
        )}

        <div className="resource-expanded" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          {task.kind === "meet" ? (
            m.link ? (
              <a className="primary-button" style={{ width: "auto", margin: 0, textDecoration: "none" }} href={m.link} {...extLink(m.link)}>
                <Video size={17} /> {t("join")}
              </a>
            ) : (
              <span className="eyebrow">{t("linkSoon")}</span>
            )
          ) : (
            <>
              <button className="primary-button" style={{ width: "auto", margin: 0 }} onClick={toggle}>
                <Check size={17} /> {isDone ? t("markUndone") : t("markDone")}
              </button>
              {m.link && (
                <a className="resource-action" href={m.link} {...extLink(m.link)}>
                  <ExternalLink size={16} /> {t("openLink")}
                </a>
              )}
            </>
          )}
          {task.subjectKey && task.kind !== "meet" && (
            <button className="resource-action" onClick={askDoubt}>
              <CircleHelp size={16} /> {t("stuckHere")}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------- */
/* Topic resources                                                                            */
/* ----------------------------------------------------------------------------------------- */

type Content = LearnData["content"][string];

function TopicDetailModal({ task, t, classWord, content, focus, isDone, toggle, close, askDoubt }: { task: LearnTask; t: T; classWord: string; content?: Content; focus?: "notes" | "dpp"; isDone: boolean; toggle: () => void; close: () => void; askDoubt: () => void }) {
  const q = encodeURIComponent(`${classWord} ${task.subject} ${task.title}`);
  // a practice step opens straight on the DPP when there is one
  const [opened, setOpened] = useState<"notes" | "dpp" | null>(focus || (task.kind === "practice" && (content?.dpp.pdf || content?.dpp.questions.length) ? "dpp" : null));
  const [vid, setVid] = useState(0);
  const [shown, setShown] = useState<Record<number, boolean>>({});
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close]);
  if (task.mentor) return <MentorModal task={task} t={t} isDone={isDone} toggle={toggle} close={close} askDoubt={askDoubt} />;

  const videos = content?.videos || [];
  const video = videos[vid];
  const notes = content?.notes || [];
  const dpp = content?.dpp;
  const hasDpp = Boolean(dpp && (dpp.pdf || dpp.questions.length));

  return (
    <div className="topic-modal-backdrop" onClick={close}>
      <section className="topic-modal" role="dialog" aria-modal="true" aria-labelledby="topic-modal-title" onClick={(e) => e.stopPropagation()}>
        <header className="topic-modal-header">
          <div>
            <p className="eyebrow">
              {task.subject} · {t("topicResources")}
            </p>
            <h2 id="topic-modal-title">{task.title}</h2>
            <p>
              {task.kind === "learn" ? t("learnStep") : t("practiceStep")} · {task.minutes} {t("min")}
            </p>
          </div>
          <button className="topic-modal-close" aria-label={t("close")} onClick={close}>
            <X size={20} />
          </button>
        </header>

        {video && (
          <section className="lesson-player">
            <p className="section-kicker">{t("lessonVideo")}</p>
            <a className="lesson-thumb" href={video.url} target="_blank" rel="noreferrer">
              {video.thumb && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={video.thumb} alt="" />
              )}
              <span className="lesson-thumb-play">
                <Play size={26} fill="currentColor" />
              </span>
            </a>
            <div className="lesson-meta">
              <strong>{video.title}</strong>
              <a href={video.url} target="_blank" rel="noreferrer">
                {t("openOnYoutube")} <ExternalLink size={14} />
              </a>
            </div>
            {videos.length > 1 && (
              <div className="lesson-more">
                <span>{t("moreVideos")}:</span>
                {videos.map((v, i) => (
                  <button key={v.url} className={i === vid ? "active" : ""} onClick={() => setVid(i)}>
                    {i + 1}. {v.title}
                  </button>
                ))}
              </div>
            )}
          </section>
        )}

        <div className="topic-resource-grid">
          {!video && (
            <article className="topic-resource-card video-resource">
              <div className="resource-icon">
                <Play size={20} fill="currentColor" />
              </div>
              <p className="section-kicker">{t("findVideo")}</p>
              <h3>
                {task.title}: {t("ytLessonT")}
              </h3>
              <p>{t("ytLessonD")}</p>
              <a className="resource-action" href={`https://www.youtube.com/results?search_query=${q}`} target="_blank" rel="noreferrer">
                {t("ytOpen")} <ChevronRight size={16} />
              </a>
            </article>
          )}

          <article className="topic-resource-card">
            <div className="resource-icon notes-icon">
              <FileText size={20} />
            </div>
            <p className="section-kicker">{notes.length ? t("notesT") : t("howStudy")}</p>
            <h3>{notes.length ? notes[0].title : t("studyT")}</h3>
            <p>{notes.length ? t("notesD") : t("studyD")}</p>
            {notes.length === 1 ? (
              <a className="resource-action" href={notes[0].url} target="_blank" rel="noreferrer">
                {t("openPdf")} <ChevronRight size={16} />
              </a>
            ) : (
              <button className="resource-action" onClick={() => setOpened(opened === "notes" ? null : "notes")}>
                {opened === "notes" ? t("close") : notes.length ? `${t("notesT")} (${notes.length})` : t("howStudyD")} <ChevronRight size={16} />
              </button>
            )}
          </article>

          <article className="topic-resource-card dpp-resource">
            <div className="resource-icon dpp-icon">
              <BookOpen size={20} />
            </div>
            <p className="section-kicker">{hasDpp ? t("dppReal") : t("practiceQs")}</p>
            <h3>{hasDpp ? (dpp!.pdf?.title || t("dppReal")) : t("dppT")}</h3>
            <p>{hasDpp ? (dpp!.questions.length ? t("dppCount", { n: dpp!.questions.length }) : t("dppRealD")) : t("dppD")}</p>
            {hasDpp && !dpp!.questions.length && dpp!.pdf ? (
              <a className="resource-action" href={dpp!.pdf.url} target="_blank" rel="noreferrer">
                {t("openDpp")} <ChevronRight size={16} />
              </a>
            ) : (
              <button className="resource-action" onClick={() => setOpened(opened === "dpp" ? null : "dpp")}>
                {opened === "dpp" ? t("close") : hasDpp ? t("openDpp") : t("practiceQsD")} <ChevronRight size={16} />
              </button>
            )}
          </article>
        </div>

        {opened === "notes" && (
          <section className="resource-expanded">
            <p className="section-kicker">{notes.length ? t("notesT") : t("howStudy")}</p>
            <h3>{task.title}</h3>
            {notes.length ? (
              <ul className="resource-links">
                {notes.map((n) => (
                  <li key={n.url}>
                    <FileText size={16} />
                    <span>{n.title}</span>
                    <a href={n.url} target="_blank" rel="noreferrer">
                      {t("openPdf")}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <ol className="dpp-questions">
                <li>{t("study1")}</li>
                <li>{t("study2")}</li>
                <li>{t("study3")}</li>
              </ol>
            )}
          </section>
        )}
        {opened === "dpp" && (
          <section className="resource-expanded">
            <p className="section-kicker">{hasDpp ? t("dppReal") : t("dppT")}</p>
            <h3>{task.title}</h3>
            {hasDpp ? (
              <>
                {dpp!.pdf && (
                  <ul className="resource-links">
                    <li>
                      <FileText size={16} />
                      <span>{dpp!.pdf.title}</span>
                      <a href={dpp!.pdf.url} target="_blank" rel="noreferrer">
                        {t("openPdf")}
                      </a>
                    </li>
                  </ul>
                )}
                {dpp!.questions.length > 0 && (
                  <>
                    <p style={{ margin: "0 0 10px", color: "var(--muted)" }}>{t("solveThen")}</p>
                    <ol className="dpp-questions mentor-questions">
                      {dpp!.questions.map((x, i) => (
                        <li key={i}>
                          <span style={{ whiteSpace: "pre-wrap" }}>{x.q}</span>
                          {x.a && (
                            <>
                              <button className="text-button" onClick={() => setShown({ ...shown, [i]: !shown[i] })}>
                                {shown[i] ? t("hideAnswer") : t("showAnswer")}
                              </button>
                              {shown[i] && <em className="mentor-answer">{x.a}</em>}
                            </>
                          )}
                        </li>
                      ))}
                    </ol>
                  </>
                )}
              </>
            ) : (
              <ol className="dpp-questions">
                <li>{t("dpp1")}</li>
                <li>{t("dpp2")}</li>
                <li>{t("dpp3")}</li>
              </ol>
            )}
          </section>
        )}

        <div className="resource-expanded" style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          <button className="primary-button" style={{ width: "auto", margin: 0 }} onClick={toggle}>
            <Check size={17} /> {isDone ? t("markUndone") : t("markDone")}
          </button>
          <button className="resource-action" onClick={askDoubt}>
            <CircleHelp size={16} /> {t("stuckHere")}
          </button>
        </div>
      </section>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------- */
/* Roadmap                                                                                    */
/* ----------------------------------------------------------------------------------------- */

function RoadmapView({ d, t, isDone, toggle, openTests, openTopic }: { d: LearnData; t: T; isDone: (id: string) => boolean; toggle: (id: string) => void; openTests: () => void; openTopic: (x: LearnTask, focus?: "notes" | "dpp") => void }) {
  const [weekIdx, setWeekIdx] = useState(d.currentWeek);
  const [filter, setFilter] = useState<string>("all");
  const week = d.weeks[weekIdx];
  const allItems = week ? week.days.flatMap((x) => x.items) : [];
  const [selectedId, setSelectedId] = useState(allItems.find((x) => !isDone(x.id))?.id ?? allItems[0]?.id);
  const selected = allItems.find((x) => x.id === selectedId) ?? allItems[0];
  const cp = week?.checkpoint !== undefined ? d.checkpoints[week.checkpoint] : undefined;
  const why = [
    d.why.strong.length ? t("whyStrong", { strong: d.why.strong.join(", ") }) : "",
    d.why.weak.length ? t("whyWeak", { weak: d.why.weak.join(", ") }) : "",
    t("whyGoal", { exam: d.exam.name, date: d.exam.dateLabel }),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="page inner-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">{t("personalPlan")}</p>
          <h1>{t("roadmap")}</h1>
          <p>{t("roadmapSub")}</p>
        </div>
        <div className="mini-prep">
          <div>
            <strong>{d.prep.pct}%</strong>
            <span>Proxam score</span>
          </div>
          <i>
            <span style={{ width: `${d.prep.pct}%` }} />
          </i>
        </div>
      </div>

      <div className="why-plan">
        <Sparkles size={18} />
        <p>
          <strong>{t("whyPlan")}</strong> {why}
        </p>
      </div>

      <div className="roadmap-toolbar">
        <div className="filter-pills">
          {[{ key: "all", name: t("allSubjects") }, ...d.subjects].map((s) => (
            <button key={s.key} className={filter === s.key ? "active" : ""} onClick={() => setFilter(s.key)}>
              {s.name}
            </button>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button className="week-select" aria-label={t("prevWeek")} disabled={weekIdx === 0} onClick={() => setWeekIdx(weekIdx - 1)}>
            <ChevronLeft size={15} />
          </button>
          <button className="week-select" aria-label={t("nextWeek")} disabled={weekIdx >= d.weeks.length - 1} onClick={() => setWeekIdx(weekIdx + 1)}>
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="roadmap-layout">
        <section className="timeline-list">
          {week && (
            <div className="timeline-week">
              <span>
                {t("week")} {weekIdx + 1}
              </span>
              <strong>{week.label}</strong>
              <small>
                {week.days.flatMap((x) => x.items).filter((x) => x.kind !== "meet" && isDone(x.id)).length} / {week.total} {t("tasksDone")}
              </small>
            </div>
          )}
          {week?.goal && (
            <div className="why-plan week-goal">
              <Flag size={18} />
              <p>
                <strong>{t("weekGoalShort")}:</strong> {week.goal}
              </p>
            </div>
          )}
          {week?.days.map((day) => {
            const items = day.items.filter((x) => filter === "all" || x.subjectKey === filter);
            if (!items.length) return null;
            return (
              <div className="timeline-group" key={day.label}>
                <h2>{day.label}</h2>
                {items.map((x) => (
                  <button
                    key={x.id}
                    className={selected?.id === x.id ? "timeline-topic selected" : "timeline-topic"}
                    onClick={() => setSelectedId(x.id)}
                  >
                    <span className={`timeline-dot ${isDone(x.id) ? "done" : x.overdue ? "progressing" : ""}`} />
                    <div>
                      <p>
                        {x.subject}
                        {x.forTest && <i>{t("forTest")}</i>}
                      </p>
                      <strong>{x.title}</strong>
                      {x.chapterId && d.content[x.chapterId] && (
                        <span className="material-tags">
                          {d.content[x.chapterId].videos.length > 0 && (
                            <em>
                              <Play size={11} fill="currentColor" /> {t("videoTag")}
                            </em>
                          )}
                          {(d.content[x.chapterId].dpp.questions.length > 0 || d.content[x.chapterId].dpp.pdf) && <em>DPP</em>}
                          {d.content[x.chapterId].notes.length > 0 && <em>{t("notesT")}</em>}
                        </span>
                      )}
                      <small>
                        {x.mentor && <b className="mentor-tag">{t("fromMentor")}</b>}
                        {kindText(x, t)} · {x.mentor?.timeLabel ? `${x.mentor.timeLabel} · ` : ""}
                        {x.minutes} {t("min")}
                      </small>
                    </div>
                    <span className="topic-state">{x.kind === "meet" ? t("kMeet") : isDone(x.id) ? t("done") : x.overdue ? t("overdue") : t("notStarted")}</span>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </div>
            );
          })}
          {week && week.days.every((day) => day.items.every((x) => filter !== "all" && x.subjectKey !== filter)) && <p className="empty-filter">{t("noTopicsFilter")}</p>}
          {weekIdx === d.weeks.length - 1 && d.hiddenWeeks > 0 && (
            <div className="why-plan next-week-note">
              <CalendarDays size={18} />
              <p>{t("nextWeekSoon", { day: d.nextWeekOn || "" })}</p>
            </div>
          )}
          {cp && (
            <div className="timeline-test">
              <div>
                <Target size={20} />
              </div>
              <span>
                <small>{cp.dateLabel}</small>
                <strong>{cp.title}</strong>
                <p>
                  {cp.readyCount} {t("of")} {cp.topics.length} {t("topicsReady")}
                </p>
              </span>
              <button onClick={openTests}>{t("viewTestTopics")}</button>
            </div>
          )}
        </section>

        {selected?.mentor && (
          <aside className="topic-detail">
            <div className="detail-label">
              <span>{t("fromMentor")}</span>
              <i>{kindText(selected, t)}</i>
            </div>
            <h2>{selected.title}</h2>
            <p style={{ whiteSpace: "pre-wrap" }}>
              {selected.dateLabel}
              {selected.mentor.timeLabel ? `, ${selected.mentor.timeLabel}` : ""} · {selected.minutes} {t("min")}
              {selected.mentor.note ? `\n\n${selected.mentor.note}` : ""}
            </p>
            <div className="detail-resources">
              <button onClick={() => openTopic(selected)}>
                {selected.kind === "questions" ? <BookOpen size={18} /> : selected.kind === "meet" ? <Video size={18} /> : <FileText size={18} />}
                <span>
                  <strong>{selected.mentor.questions?.length ? t("questionsCount", { n: selected.mentor.questions.length }) : kindText(selected, t)}</strong>
                  <small>{t("fromMentor")}</small>
                </span>
                <ChevronRight size={17} />
              </button>
            </div>
            {selected.kind === "meet" ? (
              selected.mentor.link ? (
                <a className="primary-button" style={{ textDecoration: "none" }} href={selected.mentor.link} {...extLink(selected.mentor.link)}>
                  <Video size={17} /> {t("join")}
                </a>
              ) : (
                <p className="eyebrow">{t("linkSoon")}</p>
              )
            ) : (
              <button className="primary-button" onClick={() => toggle(selected.id)}>
                <Check size={17} /> {isDone(selected.id) ? t("markUndone") : t("markDone")}
              </button>
            )}
          </aside>
        )}
        {selected && !selected.mentor && (
          <aside className="topic-detail">
            <div className="detail-label">
              <span>{selected.subject}</span>
              {selected.forTest && <i>{t("testTopic")}</i>}
            </div>
            <h2>{selected.title}</h2>
            <p>{selected.kind === "learn" ? t("learnStep") : t("practiceStep")}. {t("detailD")}</p>
{(() => {
              const c = d.content[selected.chapterId || ""];
              const v = c?.videos[0];
              const dppN = c ? c.dpp.questions.length + (c.dpp.pdf ? 1 : 0) : 0;
              const search = `https://www.youtube.com/results?search_query=${encodeURIComponent(`${d.classLine.split(" · ")[0]} ${selected.subject} ${selected.title}`)}`;
              return (
                <>
                  {v ? (
                    // the mentor's video: one tap opens it on YouTube
                    <a className="video-preview prescribed" style={{ textDecoration: "none" }} href={v.url} target="_blank" rel="noreferrer">
                      <span role="presentation" className="video-play">
                        <Play size={20} fill="currentColor" />
                      </span>
                      <span>
                        <i>{t("lessonVideo")}</i>
                        <strong>{v.title}</strong>
                        <small>{t("watchOnYt")}</small>
                      </span>
                    </a>
                  ) : (
                    <div className="video-preview pending">
                      <span role="presentation" className="video-play">
                        <Play size={20} fill="currentColor" />
                      </span>
                      <span>
                        <i>{t("lessonVideo")}</i>
                        <strong>{t("noVideoYet")}</strong>
                        <small>
                          <a href={search} target="_blank" rel="noreferrer">
                            {t("searchMeanwhile")}
                          </a>
                        </small>
                      </span>
                    </div>
                  )}
                  {c && c.videos.length > 1 && (
                    <div className="more-video-links">
                      {c.videos.slice(1).map((x) => (
                        <a key={x.url} href={x.url} target="_blank" rel="noreferrer">
                          <Play size={13} fill="currentColor" /> {x.title}
                        </a>
                      ))}
                    </div>
                  )}
                  <div className="detail-resources">
                    {c?.dpp.pdf && !c.dpp.questions.length ? (
                      <a href={c.dpp.pdf.url} target="_blank" rel="noreferrer">
                        <BookOpen size={18} />
                        <span>
                          <strong>{t("dppReal")}</strong>
                          <small>{c.dpp.pdf.title}</small>
                        </span>
                        <ExternalLink size={16} />
                      </a>
                    ) : (
                      <button onClick={() => openTopic(selected, "dpp")} disabled={!dppN} className={dppN ? "" : "is-empty"}>
                        <BookOpen size={18} />
                        <span>
                          <strong>{t("dppReal")}</strong>
                          <small>{dppN ? (c!.dpp.questions.length ? t("dppCount", { n: c!.dpp.questions.length }) : t("dppRealD")) : t("noDppYet")}</small>
                        </span>
                        {dppN > 0 && <ChevronRight size={17} />}
                      </button>
                    )}
                    {c?.notes.length === 1 ? (
                      <a href={c.notes[0].url} target="_blank" rel="noreferrer">
                        <FileText size={18} />
                        <span>
                          <strong>{t("notesT")}</strong>
                          <small>{c.notes[0].title}</small>
                        </span>
                        <ExternalLink size={16} />
                      </a>
                    ) : (
                      <button onClick={() => openTopic(selected, "notes")} disabled={!c?.notes.length} className={c?.notes.length ? "" : "is-empty"}>
                        <FileText size={18} />
                        <span>
                          <strong>{t("notesT")}</strong>
                          <small>{c?.notes.length ? `${c.notes.length} PDF` : t("noNotesYet")}</small>
                        </span>
                        {Boolean(c?.notes.length) && <ChevronRight size={17} />}
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
            <button className="primary-button" onClick={() => toggle(selected.id)}>
              <Check size={17} /> {isDone(selected.id) ? t("markUndone") : t("markDone")}
            </button>
          </aside>
        )}
      </div>
    </div>
  );
}

/* ----------------------------------------------------------------------------------------- */
/* Tests                                                                                      */
/* ----------------------------------------------------------------------------------------- */

function TestsView({ d, t, notify, openRoadmap }: { d: LearnData; t: T; notify: Notify; openRoadmap: () => void }) {
  const router = useRouter();
  const [tab, setTab] = useState<"up" | "done">("up");
  const [busy, setBusy] = useState(false);
  const cp = d.focusCp;
  const later = d.checkpoints.filter((c) => c.status !== "done" && cp && c.no > cp.no).slice(0, 3);
  const upCount = d.checkpoints.filter((c) => c.status !== "done").length;
  const latest = d.completed[0];
  const first = d.completed[d.completed.length - 1];
  const change = latest && first && d.completed.length > 1 ? latest.pct - first.pct : undefined;

  async function start() {
    if (!cp) return;
    setBusy(true);
    const r = await post("/api/learn/checkpoint", { no: cp.no });
    if (!r?.ok) {
      setBusy(false);
      return notify(r?.error || t("error"));
    }
    router.push(`/test/${r.attemptId}`);
  }

  return (
    <div className="page inner-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">{t("every14")}</p>
          <h1>{t("yourTests")}</h1>
          <p>{t("testsSub")}</p>
        </div>
        {cp && (
          <a className="calendar-button" href={`/api/learn/checkpoint/${cp.no}/ics`}>
            <CalendarDays size={17} /> {t("calendar")}
          </a>
        )}
      </div>

      <div className="view-tabs">
        <button className={tab === "up" ? "active" : ""} onClick={() => setTab("up")}>
          {t("upcoming")}
          <span>{upCount}</span>
        </button>
        <button className={tab === "done" ? "active" : ""} onClick={() => setTab("done")}>
          {t("completed")}
        </button>
      </div>

      {tab === "up" ? (
        !cp ? (
          <p className="empty-filter">{t("noTests")}</p>
        ) : (
          <>
            <section className="featured-test">
              <div className="featured-test-main">
                <div className="large-test-date">
                  <span>{cp.month}</span>
                  <strong>{cp.day}</strong>
                  <small>{cp.weekdayLong}</small>
                </div>
                <div>
                  <p className="section-kicker">
                    {t("nextTestIn")} · {cp.status === "open" ? t("openNow") : cp.daysAway === 0 ? t("today") : t("inDays", { n: cp.daysAway })}
                  </p>
                  <h2>{cp.title}</h2>
                  <div className="test-facts">
                    <span>
                      <Clock3 size={15} /> {t("anyTimeThatDay")}
                    </span>
                    <span>
                      {d.testInfo.minutes} {t("min")}
                    </span>
                    <span>
                      {d.testInfo.questions} {t("questions")}
                    </span>
                  </div>
                </div>
              </div>
              <div className="test-readiness">
                <div>
                  <strong>
                    {cp.readyCount} {t("of")} {cp.topics.length}
                  </strong>
                  <span>{t("topicsReady")}</span>
                </div>
                <div className="readiness-copy">
                  <span>{cp.readyCount === cp.topics.length ? t("allSet") : t("almostThere")}</span>
                  <div>
                    <i style={{ width: `${cp.topics.length ? (cp.readyCount / cp.topics.length) * 100 : 0}%` }} />
                  </div>
                  <small>{cp.readyCount === cp.topics.length ? t("allReady") : t("completeN", { n: cp.topics.length - cp.readyCount })}</small>
                </div>
              </div>
            </section>

            <div className="test-content-grid">
              <section className="syllabus-section">
                <div className="section-heading">
                  <div>
                    <p className="section-kicker">{t("whatCovers")}</p>
                    <h2>{t("yourNTopics", { n: cp.topics.length })}</h2>
                  </div>
                  <button onClick={openRoadmap}>{t("openRoadmap")}</button>
                </div>
                <div className="syllabus-list">
                  {cp.topics.map((x) => (
                    <div className={x.ready ? "ready" : ""} key={x.subject + x.title}>
                      {x.ready ? <Check size={15} /> : <span />}
                      <p>
                        <strong>{x.title}</strong>
                        <small>{x.subject}</small>
                      </p>
                      <i>{x.ready ? t("readyLbl") : t("todoLbl")}</i>
                    </div>
                  ))}
                </div>
              </section>

              <aside className="test-action-panel">
                <CalendarCheck size={24} />
                {cp.status === "open" ? (
                  <>
                    <h2>{t("testOpenT")}</h2>
                    <p>{t("testOpenD")}</p>
                    <button onClick={start} disabled={busy}>
                      {busy ? "..." : t("startTest")}
                    </button>
                  </>
                ) : (
                  <>
                    <h2>{t("saveDateT")}</h2>
                    <p>{t("saveDateD", { date: cp.dateLabel })}</p>
                    <div>
                      <span>{t("testWindow")}</span>
                      <strong>{t("allDay")}</strong>
                    </div>
                    <a href={`/api/learn/checkpoint/${cp.no}/ics`} className="manage-link">
                      {t("calendar")}
                    </a>
                  </>
                )}
              </aside>
            </div>

            {later.length > 0 && (
              <section className="later-tests">
                <p className="section-kicker">{t("comingLater")}</p>
                {later.map((c) => (
                  <button key={c.no} onClick={() => notify(c.dateLabel)}>
                    <span className="small-test-date">
                      <strong>{c.day}</strong> {c.month}
                    </span>
                    <div>
                      <strong>{c.title}</strong>
                      <small>
                        {c.dateLabel} · {c.topics.length} {t("topicsUnlock")}
                      </small>
                    </div>
                    <ChevronRight size={18} />
                  </button>
                ))}
              </section>
            )}
          </>
        )
      ) : (
        <section className="completed-tests">
          {latest ? (
            <>
              <div className="score-summary">
                <div>
                  <span>{t("latestScore")}</span>
                  <strong>{latest.pct}%</strong>
                  {change !== undefined && (
                    <small>
                      {change >= 0 ? t("up") : t("down")} {Math.abs(change)}% {t("fromFirst")}
                    </small>
                  )}
                </div>
                <p>{d.why.weak.length ? t("whyWeak", { weak: d.why.weak.join(", ") }) : t("onTrack")}</p>
              </div>
              {d.completed.map((x) => (
                <Link className="result-row" key={x.id} href={`/result/${x.id}`}>
                  <CheckCircle2 size={20} />
                  <span>
                    <strong>{x.title}</strong>
                    <small>
                      {x.dateLabel} · {x.correct} {t("of")} {x.total} {t("correct")}
                    </small>
                  </span>
                  <b>{x.pct}%</b>
                  <ChevronRight size={18} />
                </Link>
              ))}
            </>
          ) : (
            <p className="empty-filter">{t("noCompleted")}</p>
          )}
        </section>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------------------- */
/* Doubts                                                                                     */
/* ----------------------------------------------------------------------------------------- */

function DoubtsView({ d, t, notify, prefill }: { d: LearnData; t: T; notify: Notify; prefill?: { subject: string; topic: string } }) {
  const router = useRouter();
  const [tab, setTab] = useState<"ask" | "mine">(prefill || !d.doubts.length ? "ask" : d.unreadDoubts ? "mine" : "ask");
  const [subject, setSubject] = useState(prefill?.subject || d.subjects[0]?.key || "");
  const [topic, setTopic] = useState(prefill?.topic || d.chapterTitles[subject]?.[0] || "");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [openId, setOpenId] = useState(d.doubts.find((x) => x.unread)?.id ?? d.doubts[0]?.id);
  const [follow, setFollow] = useState<string | null>(null);
  const thread = d.doubts.find((x) => x.id === openId);

  useEffect(() => {
    if (tab === "mine" && thread?.unread) post(`/api/learn/doubts/${thread.id}`, { action: "seen" }).then(() => router.refresh());
  }, [tab, thread?.id, thread?.unread, router]);

  async function submit() {
    if (question.trim().length < 10) return notify(t("stuckPh"));
    setBusy(true);
    const r = await post("/api/learn/doubts", { subject, topic, text: question });
    setBusy(false);
    if (!r?.ok) return notify(r?.error || t("error"));
    setSent(true);
    setQuestion("");
    notify(t("sentT"));
    router.refresh();
  }
  async function act(action: "clear" | "followup") {
    if (!thread) return;
    const r = await post(`/api/learn/doubts/${thread.id}`, { action, text: follow || "" });
    if (!r?.ok) return notify(r?.error || t("error"));
    setFollow(null);
    router.refresh();
  }

  return (
    <div className="page inner-page">
      <div className="page-title-row doubt-title">
        <div>
          <p className="eyebrow">{t("realTeachers")}</p>
          <h1>{t("askDoubt")}</h1>
          <p>{t("doubtSub")}</p>
        </div>
        <div className="mentor-online">
          <div>
            <UserRound size={21} />
          </div>
          <span>
            <strong>{t("replyTime")}</strong>
            <small>{t("replyTimeD")}</small>
          </span>
        </div>
      </div>

      <div className="view-tabs">
        <button className={tab === "ask" ? "active" : ""} onClick={() => setTab("ask")}>
          {t("askDoubt")}
        </button>
        <button className={tab === "mine" ? "active" : ""} onClick={() => setTab("mine")}>
          {t("myDoubts")}
          {d.doubts.length > 0 && <span>{d.doubts.length}</span>}
        </button>
      </div>

      {tab === "ask" ? (
        <div className="doubt-layout">
          <section className="doubt-form">
            {sent && (
              <div className="sent-message">
                <CheckCircle2 size={20} />
                <p>
                  <strong>{t("sentT")}</strong> {t("sentD")}
                </p>
                <button onClick={() => setSent(false)}>{t("askAnother")}</button>
              </div>
            )}
            <div className="form-row">
              <div className="field">
                <span>{t("subject")}</span>
                <Select
                  ariaLabel={t("subject")}
                  value={subject}
                  options={d.subjects.map((s) => ({ value: s.key, label: s.name }))}
                  onChange={(v) => {
                    setSubject(v);
                    setTopic(d.chapterTitles[v]?.[0] || "");
                  }}
                />
              </div>
              <div className="field">
                <span>{t("topic")}</span>
                <Select ariaLabel={t("topic")} value={topic} options={(d.chapterTitles[subject] || []).map((c) => ({ value: c, label: c }))} onChange={setTopic} />
              </div>
            </div>
            <label className="question-field">
              {t("stuckOn")}
              <textarea value={question} maxLength={1000} onChange={(e) => setQuestion(e.target.value)} placeholder={t("stuckPh")} />
              <span>{question.length}/1000</span>
            </label>
            <div className="form-submit">
              <p>{t("privateNote")}</p>
              <button onClick={submit} disabled={busy}>
                {busy ? t("sending") : t("sendMentor")} <Send size={16} />
              </button>
            </div>
          </section>

          <aside className="doubt-help">
            <p className="section-kicker">{t("goodDoubt")}</p>
            <h2>{t("tellTried")}</h2>
            <ol>
              <li>
                <span>1</span>
                {t("tip1")}
              </li>
              <li>
                <span>2</span>
                {t("tip2")}
              </li>
              <li>
                <span>3</span>
                {t("tip3")}
              </li>
            </ol>
            <div>
              <Headphones size={20} />
              <p>
                <strong>{t("stillUnclear")}</strong> {t("stillUnclearD")}
              </p>
            </div>
          </aside>
        </div>
      ) : d.doubts.length === 0 ? (
        <p className="empty-filter">{t("noDoubts")}</p>
      ) : (
        <div className="my-doubts-layout">
          <section className="doubt-inbox">
            {d.doubts.map((x) => (
              <button key={x.id} className={`doubt-thread ${x.id === openId ? "active" : ""}`} onClick={() => setOpenId(x.id)}>
                <span className={`thread-avatar ${x.status === "open" ? "alt" : ""}`}>{x.subject.slice(0, 2).toUpperCase()}</span>
                <div>
                  <p>
                    {x.subject} <i className={x.status === "open" ? "open" : ""}>{x.status === "open" ? t("open") : x.status === "answered" ? t("answered") : t("resolved")}</i>
                  </p>
                  <strong>{x.messages[0]?.text.slice(0, 80)}</strong>
                  <small>
                    {x.topic} · {x.updated}
                  </small>
                </div>
              </button>
            ))}
          </section>
          {thread && (
            <section className="thread-detail">
              <div className="thread-head">
                <div>
                  <span>{thread.subject.toUpperCase()}</span>
                  <h2>{thread.topic}</h2>
                </div>
                <i>{thread.status === "open" ? t("open") : thread.status === "answered" ? t("answered") : t("resolved")}</i>
              </div>
              {thread.messages.map((m, i) =>
                m.from === "student" ? (
                  <div className="student-message" key={i}>
                    <p style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
                    <small>
                      {t("you")} · {m.at}
                    </small>
                  </div>
                ) : (
                  <div className="mentor-message" key={i}>
                    <div className="thread-avatar">{(m.by || "M").slice(0, 2).toUpperCase()}</div>
                    <div>
                      <strong>{m.by || t("mentor")}</strong>
                      <p style={{ whiteSpace: "pre-wrap" }}>{m.text}</p>
                      <small>{m.at}</small>
                    </div>
                  </div>
                ),
              )}
              {thread.status === "open" && <p className="empty-filter">{t("waitingReply")}</p>}
              {thread.status === "answered" &&
                (follow === null ? (
                  <div className="clarity-check">
                    <p>
                      <strong>{t("isClear")}</strong> {t("isClearD")}
                    </p>
                    <button onClick={() => act("clear")}>{t("yesClear")}</button>
                    <button onClick={() => setFollow("")}>{t("notYet")}</button>
                  </div>
                ) : (
                  <div className="doubt-form" style={{ marginTop: 16 }}>
                    <label className="question-field">
                      {t("followupPh")}
                      <textarea value={follow} maxLength={1000} onChange={(e) => setFollow(e.target.value)} />
                    </label>
                    <div className="form-submit">
                      <p />
                      <button onClick={() => act("followup")}>
                        {t("sendFollowup")} <Send size={16} />
                      </button>
                    </div>
                  </div>
                ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------------------- */
/* App shell + Home                                                                           */
/* ----------------------------------------------------------------------------------------- */

export default function LearnApp({ data: d, initialTab }: { data: LearnData; initialTab: Tab }) {
  const router = useRouter();
  const t = useMemo(() => lt(d.lang), [d.lang]);
  const [tab, setTabState] = useState<Tab>(initialTab);
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [modal, setModalState] = useState<LearnTask | null>(null);
  const [modalFocus, setModalFocus] = useState<"notes" | "dpp" | undefined>();
  const setModal = (x: LearnTask | null, focus?: "notes" | "dpp") => {
    setModalFocus(focus);
    setModalState(x);
  };
  const [prefill, setPrefill] = useState<{ subject: string; topic: string } | undefined>();
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});

  const allTasks = useMemo(() => {
    const m = new Map<string, LearnTask>();
    for (const w of d.weeks) for (const day of w.days) for (const x of day.items) m.set(x.id, x);
    for (const x of d.today) m.set(x.id, x);
    return m;
  }, [d]);
  const isDone = (id: string) => overrides[id] ?? allTasks.get(id)?.done ?? false;

  const notify: Notify = (m) => {
    setToast(m);
    window.setTimeout(() => setToast(""), 2600);
  };
  const setTab = (x: Tab) => {
    setTabState(x);
    setMenuOpen(false);
    window.history.replaceState(null, "", x === "home" ? "/dashboard" : `/dashboard?tab=${x}`);
    window.scrollTo({ top: 0 });
  };
  async function toggle(id: string) {
    const next = !isDone(id);
    setOverrides((o) => ({ ...o, [id]: next }));
    const r = await post("/api/learn/step", { id, done: next });
    if (!r?.ok) {
      setOverrides((o) => ({ ...o, [id]: !next }));
      return notify(r?.error || t("error"));
    }
    notify(next ? t("savedDone") : t("savedUndone"));
    router.refresh();
  }
  function setLang(lang: "en" | "hi") {
    document.cookie = `lang=${lang}; path=/; max-age=31536000; samesite=lax`;
    router.refresh();
  }
  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/");
    router.refresh();
  }
  function askAbout(x: LearnTask) {
    setModal(null);
    setPrefill({ subject: x.subjectKey, topic: x.title });
    setTab("doubts");
  }

  const remaining = d.today.filter((x) => !isDone(x.id));
  const minutesLeft = remaining.reduce((n, x) => n + x.minutes, 0);
  const overdue = d.today.filter((x) => x.overdue && !isDone(x.id)).length;
  const cp = d.focusCp;
  const classWord = d.classLine.split(" · ")[0];

  const navItems: { id: Tab; label: string; short: string; icon: typeof Home; badge?: number }[] = [
    { id: "home", label: t("home"), short: t("home"), icon: Home },
    { id: "roadmap", label: t("roadmap"), short: t("roadmapShort"), icon: CalendarDays },
    { id: "tests", label: t("tests"), short: t("tests"), icon: Target },
    { id: "doubts", label: t("askDoubt"), short: t("doubtsShort"), icon: MessageCircleQuestion, badge: d.unreadDoubts },
  ];

  return (
    <div className="learn-app">
      <div className="app-shell">
        <aside className={menuOpen ? "sidebar is-open" : "sidebar"}>
          <div className="sidebar-top">
            <Logo />
            <button className="mobile-close" aria-label={t("closeMenu")} onClick={() => setMenuOpen(false)}>
              <X size={20} />
            </button>
          </div>

          <nav className="main-nav" aria-label="Main navigation">
            <p className="nav-label">{t("learn")}</p>
            {navItems.map(({ id, label, icon: Icon, badge }) => (
              <button key={id} className={tab === id ? "nav-item active" : "nav-item"} onClick={() => setTab(id)}>
                <Icon size={19} strokeWidth={1.8} />
                <span>{label}</span>
                {badge ? <i>{badge}</i> : null}
              </button>
            ))}
            {(d.batches.list.length > 1 || d.batches.canJoinMore) && (
              <>
                <p className="nav-label" style={{ marginTop: 22 }}>
                  {t("myBatches")}
                </p>
                {d.batches.list.length > 1 &&
                  d.batches.list.map((b) => (
                    <button
                      key={b.id}
                      className={b.current ? "nav-item active" : "nav-item"}
                      aria-current={b.current ? "true" : undefined}
                      disabled={b.current}
                      onClick={() =>
                        fetch("/api/batch/switch", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: b.id }) })
                          .then(() => {
                            setMenuOpen(false);
                            setTab("home");
                            router.refresh();
                          })
                          .catch(() => {})
                      }
                    >
                      <Layers size={19} strokeWidth={1.8} />
                      <span>{b.label}</span>
                    </button>
                  ))}
                {d.batches.canJoinMore && (
                  <Link href="/batch" className="nav-item">
                    <Plus size={19} strokeWidth={1.8} />
                    <span>{t("joinAnother")}</span>
                  </Link>
                )}
              </>
            )}
            <p className="nav-label" style={{ marginTop: 22 }}>
              {t("more")}
            </p>
            <Link href="/masterclass" className="nav-item">
              <Presentation size={19} strokeWidth={1.8} />
              <span>{t("masterclass")}</span>
            </Link>
            <Link href="/book-call" className="nav-item">
              <Headphones size={19} strokeWidth={1.8} />
              <span>{t("freeCall")}</span>
            </Link>
            <Link href="/" className="nav-item">
              <Globe size={19} strokeWidth={1.8} />
              <span>{t("website")}</span>
            </Link>
          </nav>

          <div className="sidebar-help">
            <LifeBuoy size={22} />
            <p>
              <strong>{t("stuckT")}</strong>
              {t("stuckD")}
            </p>
            <button onClick={() => setTab("doubts")}>
              {t("talkMentor")} <ChevronRight size={15} />
            </button>
          </div>

          <div style={{ position: "relative" }}>
            <button className="profile-row" style={{ width: "100%", border: 0, background: "transparent", textAlign: "left" }} onClick={() => setProfileOpen(!profileOpen)} aria-expanded={profileOpen}>
              <div className="avatar">{d.initials}</div>
              <div>
                <strong>{d.name}</strong>
                <span>{d.classLine}</span>
              </div>
              <ChevronDown size={17} />
            </button>
            {profileOpen && (
              <div className="profile-menu">
                <button onClick={logout}>
                  <LogOut size={16} /> {t("logout")}
                </button>
              </div>
            )}
          </div>
        </aside>

        {menuOpen && <button className="scrim" aria-label={t("closeMenu")} onClick={() => setMenuOpen(false)} />}

        <main>
          <header className="topbar">
            <button className="menu-button" onClick={() => setMenuOpen(true)} aria-label={t("openMenu")}>
              <Menu size={22} />
            </button>
            <div className="mobile-brand">
              <Logo />
            </div>
            <div className="top-actions">
              <div className="language-switch" aria-label="Language">
                <button className={d.lang === "en" ? "selected" : ""} onClick={() => setLang("en")}>
                  EN
                </button>
                <button className={d.lang === "hi" ? "selected" : ""} onClick={() => setLang("hi")}>
                  हिं
                </button>
              </div>
              <NoticeBell items={d.notices} lang={d.lang} replies={d.unreadDoubts} onReplies={() => setTab("doubts")} buttonClassName="icon-button" />
              <div className="mini-avatar">{d.initials}</div>
            </div>
          </header>

          {tab === "home" ? (
            <div className="page">
              <section className="welcome">
                <div>
                  <p className="eyebrow">{d.todayLabel}</p>
                  <h1>
                    {t(`good${d.greeting}` as "goodmorning")}, {d.firstName}.
                  </h1>
                  <p>{d.prep.pct === 0 ? t("welcomeNew") : t("welcomeBack")}</p>
                  {d.batches.list.length > 1 && (
                    <button type="button" className="batch-chip" onClick={() => setMenuOpen(true)}>
                      <Layers size={15} strokeWidth={2} /> {d.batches.list.find((b) => b.current)?.label} · {t("switchBatch")}
                    </button>
                  )}
                </div>
                <div className="streak">
                  <span>
                    <Flame size={19} fill="currentColor" />
                  </span>
                  <div>
                    {d.streak.current > 0 ? (
                      <>
                        <strong>
                          {d.streak.current} {t("dayStreak")}
                        </strong>
                        <small>
                          {t("bestIs")} {d.streak.best} {d.streak.best === 1 ? t("day") : t("days")}
                        </small>
                      </>
                    ) : (
                      <strong>{t("startStreak")}</strong>
                    )}
                  </div>
                </div>
              </section>

              {d.openAttemptId && (
                <div className="why-plan">
                  <Clock3 size={18} />
                  <p>
                    <strong>{t("testInProgress")}</strong>
                  </p>
                  <Link href={`/test/${d.openAttemptId}`}>{t("resume")}</Link>
                </div>
              )}

              <section className="progress-band">
                <div className="progress-copy">
                  <div className="progress-ring" style={{ "--value": `${d.prep.pct * 3.6}deg` } as React.CSSProperties}>
                    <div>
                      <strong>{d.prep.pct}%</strong>
                      <span>{t("ready")}</span>
                    </div>
                  </div>
                  <div>
                    <p className="section-kicker">
                      <Sparkles size={15} /> {t("yourProxam")}
                    </p>
                    <h2>{overdue > 0 ? `${overdue} ${t("behind")}` : t("onTrack")}</h2>
                    <p>{t("finishToday")}</p>
                  </div>
                </div>
                <div className="progress-stats">
                  <div>
                    <strong>
                      {d.prep.covered}/{d.prep.totalChapters}
                    </strong>
                    <span>{t("chaptersCovered")}</span>
                  </div>
                  <div>
                    <strong>{d.prep.pending}</strong>
                    <span>{t("pendingForTest")}</span>
                  </div>
                  <div>
                    <strong>{d.exam.daysLeft}</strong>
                    <span>
                      {t("daysTo")} {d.exam.name}
                    </span>
                  </div>
                </div>
              </section>

              {d.weekGoal && (
                <div className="why-plan week-goal">
                  <Flag size={18} />
                  <p>
                    <strong>{t("weekGoal")}:</strong> {d.weekGoal}
                  </p>
                </div>
              )}

              <div className="content-grid">
                <div className="primary-column">
                  <section className="today-section">
                    <div className="section-heading">
                      <div>
                        <p className="section-kicker">{t("todaysPlan")}</p>
                        <h2>{d.todayAhead && remaining.length ? t("getAhead") : remaining.length === 0 ? t("allDone") : `${remaining.length} ${t("thingsToDo")}`}</h2>
                      </div>
                      {minutesLeft > 0 && (
                        <span className="time-total">
                          <Clock3 size={16} /> {t("about")} {minutesLeft} {t("min")}
                        </span>
                      )}
                    </div>

                    <div className="task-list">
                      {d.today.map((x) => {
                        const done = isDone(x.id);
                        return (
                          <article className={done ? "task-row complete" : "task-row"} key={x.id}>
                            <button className="task-check" aria-label={done ? t("markIncomplete") : t("markComplete")} onClick={() => toggle(x.id)}>
                              {done && <Check size={16} strokeWidth={3} />}
                            </button>
                            <div className={`subject-icon ${x.mentor ? "subject-mentor" : x.kind === "learn" ? "subject-physics" : "subject-mathematics"}`}>
                              {x.mentor ? <Sparkles size={18} /> : x.kind === "learn" ? <Play size={18} fill="currentColor" /> : x.overdue ? <RotateCcw size={18} /> : <BookOpen size={18} />}
                            </div>
                            <div className="task-main">
                              <div className="task-meta">
                                <span>{x.subject}</span>
                                {x.mentor && <i>{t("fromMentor")}</i>}
                                {x.forTest && <i>{t("forTest")}</i>}
                                {x.overdue && !done && <i>{t("overdue")}</i>}
                              </div>
                              <button className="topic-title-button" onClick={() => setModal(x)}>
                                {x.title}
                              </button>
                              <p>{stepText(x, t)}</p>
                            </div>
                            <div className="task-end">
                              <span>
                                {x.minutes} {t("min")}
                              </span>
                              <button aria-label={x.title} onClick={() => setModal(x)}>
                                <ChevronRight size={19} />
                              </button>
                            </div>
                          </article>
                        );
                      })}
                    </div>

                    <button className="view-roadmap" onClick={() => setTab("roadmap")}>
                      {t("seeRoadmap")} <ChevronRight size={16} />
                    </button>
                  </section>

                  <section className="roadmap-preview">
                    <div className="section-heading compact">
                      <div>
                        <p className="section-kicker">{t("yourWeek")}</p>
                        <h2>{t("steadyWeek")}</h2>
                      </div>
                      <span className="time-total">{d.monthLabel}</span>
                    </div>
                    <div className="week-strip">
                      {d.strip.map((x) => (
                        <button className={`week-day ${x.state === "missed" ? "next" : x.state}`} key={x.day + x.date} onClick={() => (x.state === "test" ? setTab("tests") : setTab("roadmap"))}>
                          <span>{x.day}</span>
                          <strong>{x.date}</strong>
                          {x.state === "done" && <Check size={13} />}
                          {x.state === "today" && <i />}
                          {x.state === "test" && <Target size={13} />}
                        </button>
                      ))}
                    </div>
                  </section>
                </div>

                <aside className="right-column">
                  {cp && (
                    <section className="test-panel">
                      <div className="test-date">
                        <span>{cp.weekday}</span>
                        <strong>{cp.day}</strong>
                        <small>{cp.month}</small>
                      </div>
                      <div className="test-copy">
                        <p className="section-kicker">{cp.status === "open" ? t("openNow") : t("nextTest")}</p>
                        <h2>{cp.title}</h2>
                        <p>
                          {t("anyTimeThatDay")} · {d.testInfo.minutes} {t("min")} · {d.testInfo.questions} {t("questions")}
                        </p>
                      </div>
                      <div className="coverage">
                        <div>
                          <span>{t("topicCoverage")}</span>
                          <strong>
                            {cp.readyCount} {t("of")} {cp.topics.length}
                          </strong>
                        </div>
                        <div className="bar">
                          <span style={{ width: `${cp.topics.length ? (cp.readyCount / cp.topics.length) * 100 : 0}%` }} />
                        </div>
                      </div>
                      <p className="test-nudge">
                        <Target size={17} /> {cp.readyCount === cp.topics.length ? t("allReady") : `${cp.topics.length - cp.readyCount} ${t("completeMore")}`}
                      </p>
                      <button className="primary-button" onClick={() => setTab("tests")}>
                        {t("viewTestTopics")} <ChevronRight size={17} />
                      </button>
                    </section>
                  )}

                  {d.meets.map((m) => (
                    <button key={m.id} className="masterclass-card meet-card" onClick={() => setModal(m)}>
                      <Video size={20} />
                      <span>
                        <small>{t("yourMeeting")}</small>
                        <strong>{m.title}</strong>
                        <em>
                          {m.dateLabel}
                          {m.mentor?.timeLabel ? `, ${m.mentor.timeLabel}` : ""}
                        </em>
                      </span>
                      {m.mentor?.link ? (
                        <a className="meet-join" href={m.mentor.link} {...extLink(m.mentor.link)} onClick={(e) => e.stopPropagation()}>
                          {t("join")}
                        </a>
                      ) : (
                        <ChevronRight size={18} />
                      )}
                    </button>
                  ))}

                  {d.masterclass && (
                    <Link href="/masterclass" className="masterclass-card">
                      <Presentation size={20} />
                      <span>
                        <small>{t("yourMasterclass")}</small>
                        <strong>{d.masterclass.title}</strong>
                        <em>{d.masterclass.when}</em>
                      </span>
                      <ChevronRight size={18} />
                    </Link>
                  )}

                  <section className="mentor-panel">
                    <div className="mentor-visual">
                      <div className="mentor-avatar">
                        <UserRound size={26} />
                      </div>
                      <div className="voice-lines">
                        <i />
                        <i />
                        <i />
                        <i />
                        <i />
                      </div>
                    </div>
                    <p className="section-kicker">{t("humanHelp")}</p>
                    <h2>{t("notClicking")}</h2>
                    <p>{t("mentorD")}</p>
                    <button onClick={() => setTab("doubts")}>
                      <CircleHelp size={17} /> {t("askDoubt")}
                    </button>
                    {d.call ? (
                      d.call.link ? (
                        <a className="text-button" href={d.call.link} target="_blank" rel="noreferrer">
                          <Headphones size={17} /> {t("joinCall")}: {d.call.when}
                        </a>
                      ) : (
                        <Link className="text-button" href="/book-call">
                          <Headphones size={17} /> {t("callBooked")}: {d.call.when}
                        </Link>
                      )
                    ) : (
                      <Link className="text-button" href="/book-call">
                        <Headphones size={17} /> {t("bookCall")}
                      </Link>
                    )}
                  </section>

                  <p className="roadmap-note">
                    <Sparkles size={16} />
                    {t("adapts")}
                  </p>
                </aside>
              </div>
            </div>
          ) : tab === "roadmap" ? (
            <RoadmapView d={d} t={t} isDone={isDone} toggle={toggle} openTests={() => setTab("tests")} openTopic={(x, focus) => setModal(x, focus)} />
          ) : tab === "tests" ? (
            <TestsView d={d} t={t} notify={notify} openRoadmap={() => setTab("roadmap")} />
          ) : (
            <DoubtsView key={prefill?.topic || "doubts"} d={d} t={t} notify={notify} prefill={prefill} />
          )}

          <nav className="bottom-nav" aria-label="Mobile navigation">
            {navItems.map(({ id, short, icon: Icon, badge }) => (
              <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
                <Icon size={20} />
                <span>{short}</span>
                {badge ? <i className="bottom-badge">{badge}</i> : null}
              </button>
            ))}
          </nav>
        </main>

        {toast && (
          <div className="toast" role="status">
            <Check size={16} /> {toast}
          </div>
        )}
        {modal && (
          <TopicDetailModal
            task={modal}
            t={t}
            classWord={classWord}
            content={modal.chapterId ? d.content[modal.chapterId] : undefined}
            focus={modalFocus}
            isDone={isDone(modal.id)}
            toggle={() => toggle(modal.id)}
            close={() => setModal(null)}
            askDoubt={() => askAbout(modal)}
          />
        )}
      </div>
    </div>
  );
}
