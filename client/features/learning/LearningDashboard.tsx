import Image from "next/image";
import Link from "next/link";
import { AuthenticationControls } from "@/features/authentication/AuthenticationControls";
import dashboard from "./learning-dashboard.json";
import styles from "./learning-dashboard.module.css";

type LearningDashboardProps = {
  learnerName: string;
};

export function LearningDashboard({ learnerName }: LearningDashboardProps) {
  const firstName = learnerName.split(/[\s.@_-]/)[0] || "Scholar";
  const { currentCourse, courses } = dashboard;

  return (
    <main className={styles.page}>
      <div className={styles.frame}>
        <header className={styles.header}>
          <Link className={styles.brand} href="/" aria-label="Bayes Institute home">
            <Image src="/assets/logos/svg/full-logo/primary.svg" alt="Bayes Institute" width={170} height={72} unoptimized />
          </Link>
          <nav className={styles.navigation} aria-label="Learning navigation">
            <a className={styles.activeNav} href="#overview" aria-current="page">Overview</a>
            <a href="#courses">My courses</a>
            <a href="#activity">Activity</a>
          </nav>
          <AuthenticationControls />
        </header>

        <div className={styles.content}>
          <section className={styles.welcome} id="overview" aria-labelledby="welcome-title">
            <div>
              <p className={styles.eyebrow}><span /> Your learning space</p>
              <h1 id="welcome-title">Good to see you, <em>{firstName}.</em></h1>
              <p className={styles.welcomeCopy}>A little progress each day adds up. Pick up where you left off.</p>
            </div>
            <div className={styles.dateCard}>
              <span className={styles.dateIcon} aria-hidden="true">✳</span>
              <div><span className={styles.dateLabel}>Your learning rhythm</span><strong>Steady progress</strong></div>
            </div>
          </section>

          <section className={styles.stats} aria-label="Learning summary">
            <article className={styles.statCard}>
              <span className={styles.statIcon} aria-hidden="true">↗</span>
              <div><p>Courses underway</p><strong>01</strong></div>
              <span className={styles.statFoot}>One thoughtful step at a time</span>
            </article>
            <article className={styles.statCard}>
              <span className={`${styles.statIcon} ${styles.statIconGreen}`} aria-hidden="true">✓</span>
              <div><p>Lessons completed</p><strong>{String(currentCourse.completedLessons).padStart(2, "0")}</strong></div>
              <span className={styles.statFoot}>Across your learning path</span>
            </article>
            <article className={`${styles.statCard} ${styles.streakCard}`}>
              <span className={`${styles.statIcon} ${styles.statIconSand}`} aria-hidden="true">✦</span>
              <div><p>Learning streak</p><strong>03 <small>days</small></strong></div>
              <span className={styles.statFoot}>Keep your momentum going</span>
            </article>
          </section>

          <section className={styles.continueSection} aria-labelledby="continue-title">
            <div className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}><span /> Pick up where you left off</p><h2 id="continue-title">Continue learning</h2></div>
              <a className={styles.textLink} href="#courses">View all courses <span aria-hidden="true">→</span></a>
            </div>
            <article className={styles.continueCard}>
              <div className={styles.courseArtwork} aria-hidden="true">
                <span className={styles.artOrbitOne} /><span className={styles.artOrbitTwo} />
                <span className={styles.artCore}>μ</span><span className={styles.artDot} />
                <span className={styles.artLabel}>B / {currentCourse.chapter.slice(-2)}</span>
              </div>
              <div className={styles.continueDetails}>
                <div className={styles.courseMeta}><span>{currentCourse.chapter}</span><span className={styles.metaDivider} /><span>{currentCourse.duration} left</span></div>
                <h3>{currentCourse.title}</h3>
                <p className={styles.lessonName}>{currentCourse.lesson}</p>
                <div className={styles.progressHeader}><span>Course progress</span><strong>{currentCourse.progress}%</strong></div>
                <div className={styles.progressTrack} role="progressbar" aria-label="Probability and Statistics course progress" aria-valuenow={currentCourse.progress} aria-valuemin={0} aria-valuemax={100}><span style={{ width: `${currentCourse.progress}%` }} /></div>
                <Link className={styles.continueButton} href="#courses">Continue lesson <span aria-hidden="true">→</span></Link>
              </div>
            </article>
          </section>

          <section className={styles.coursesSection} id="courses" aria-labelledby="courses-title">
            <div className={styles.sectionHeading}>
              <div><p className={styles.eyebrow}><span /> Your library</p><h2 id="courses-title">My courses</h2></div>
              <p className={styles.sectionNote}>Curious minds build knowledge one idea at a time.</p>
            </div>
            <div className={styles.courseGrid}>
              {courses.map((course) => (
                <article className={styles.libraryCard} key={course.number}>
                  <div className={`${styles.libraryArtwork} ${course.tone === "verdigris" ? styles.greenArtwork : ""}`}>
                    <span className={styles.libraryNumber}>{course.number} / LEARNING PATH</span>
                    <span className={styles.libraryGlyph} aria-hidden="true">{course.tone === "verdigris" ? "∴" : "∑"}</span>
                    <span className={styles.libraryCategory}>{course.category}</span>
                  </div>
                  <div className={styles.libraryInfo}>
                    <div className={styles.libraryTitleRow}><h3>{course.title}</h3><span className={course.progress ? styles.statusActive : styles.statusReady}>{course.status}</span></div>
                    <p>{course.description}</p>
                    {course.progress > 0 ? (
                      <div className={styles.libraryProgress}><span className={styles.miniTrack}><span style={{ width: `${course.progress}%` }} /></span><span>{course.progress}% complete</span></div>
                    ) : <a className={styles.exploreLink} href="#continue-title">Explore course <span aria-hidden="true">→</span></a>}
                  </div>
                </article>
              ))}
              <aside className={styles.addCourseCard}>
                <span className={styles.addMark} aria-hidden="true">+</span>
                <h3>Room to grow</h3>
                <p>More learning paths will find their way here.</p>
              </aside>
            </div>
          </section>

          <footer className={styles.footer} id="activity">
            <Image src="/assets/logos/svg/emblem/primary.svg" alt="" width={27} height={27} unoptimized />
            <p>Learn with clarity.</p>
            <span>Bayes Institute · Your progress, your pace</span>
          </footer>
        </div>
      </div>
    </main>
  );
}
