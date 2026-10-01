import Link from "next/link";
import Image from "next/image";

const pathways = [
  {
    number: "01",
    title: "Probability & uncertainty",
    description: "Build an intuition for chance, evidence, and what we can know.",
    lessons: "6 lessons",
    tone: "burgundy",
  },
  {
    number: "02",
    title: "Thinking with data",
    description: "Learn to read patterns carefully and ask better questions of data.",
    lessons: "8 lessons",
    tone: "verdigris",
  },
  {
    number: "03",
    title: "Bayesian reasoning",
    description: "Update your beliefs as new information comes into view.",
    lessons: "5 lessons",
    tone: "sand",
  },
];

export default function Home() {
  return (
    <main>
      <div className="page-shell">
        <header className="masthead">
          <Link className="brand" href="/" aria-label="Bayes Institute home">
            <Image
              src="/assets/logos/svg/full-logo/primary.svg"
              alt="Bayes Institute"
              width={190}
              height={80}
              unoptimized
            />
          </Link>
          <nav className="navigation" aria-label="Main navigation">
            <Link href="#pathways">Explore</Link>
            <Link href="#approach">Our approach</Link>
          </nav>
          <Link className="button button-outline masthead-action" href="#pathways">
            Start learning <span aria-hidden="true">↗</span>
          </Link>
        </header>

        <section className="hero" aria-labelledby="hero-title">
          <div className="hero-copy">
            <p className="eyebrow"><span className="eyebrow-mark" /> A place to begin</p>
            <h1 id="hero-title">Make sense of <em>what you don’t know.</em></h1>
            <p className="hero-description">
              Explore probability, data, and decision science through clear lessons
              designed to make complex ideas feel within reach.
            </p>
            <div className="hero-actions">
              <Link className="button button-primary" href="#pathways">
                Explore learning paths <span aria-hidden="true">↗</span>
              </Link>
              <span className="hero-note">Curiosity is a good place to start.</span>
            </div>
          </div>

          <aside className="welcome-card" id="approach">
            <div className="welcome-card-top">
              <span className="card-index">B / 01</span>
              <span className="live-dot" aria-label="Open learning library" />
            </div>
            <div className="orbit-art" aria-hidden="true">
              <span className="orbit orbit-one" />
              <span className="orbit orbit-two" />
              <span className="orbit orbit-three" />
              <span className="orbit-core">B</span>
              <span className="orbit-point point-one" />
              <span className="orbit-point point-two" />
            </div>
            <div className="welcome-card-bottom">
              <p className="card-label">The Bayes Institute</p>
              <h2>Learn to think clearly in an uncertain world.</h2>
              <p>Small ideas. Strong foundations. Progress that feels like your own.</p>
            </div>
          </aside>
        </section>

        <section className="pathways section-rule" id="pathways" aria-labelledby="pathways-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">The learning library</p>
              <h2 id="pathways-title">Start with a question.</h2>
            </div>
            <p className="section-intro">
              Follow a learning path, or take the idea that has been on your mind.
              Each starts with the essentials and builds from there.
            </p>
          </div>

          <div className="pathway-list">
            {pathways.map((pathway) => (
              <Link className="pathway" href="#pathways" key={pathway.number}>
                <span className={`pathway-mark ${pathway.tone}`} aria-hidden="true">
                  {pathway.number}
                </span>
                <span className="pathway-content">
                  <span className="pathway-title">{pathway.title}</span>
                  <span className="pathway-description">{pathway.description}</span>
                </span>
                <span className="pathway-meta">{pathway.lessons}</span>
                <span className="pathway-arrow" aria-hidden="true">↗</span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="footer">
          <Image
            src="/assets/logos/svg/emblem/primary.svg"
            alt=""
            width={31}
            height={31}
            unoptimized
          />
          <p>Thoughtful learning for a world of uncertainty.</p>
          <span>Bayes Institute</span>
        </footer>
      </div>
    </main>
  );
}
