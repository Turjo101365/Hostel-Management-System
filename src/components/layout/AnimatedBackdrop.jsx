const variantClasses = {
  hero: {
    base: 'bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.16),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_26%),linear-gradient(180deg,rgba(255,255,255,0.72),rgba(248,250,252,0.94))] dark:bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.2),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.16),transparent_26%),linear-gradient(180deg,rgba(2,6,23,0.82),rgba(15,23,42,0.95))]',
    grid: 'opacity-70 dark:opacity-30',
    orbOne: 'left-[-7rem] top-16 h-80 w-80 bg-cyan-300/40 dark:bg-cyan-500/22',
    orbTwo: 'right-[-6rem] top-1/4 h-[22rem] w-[22rem] bg-emerald-300/34 dark:bg-emerald-500/22',
    orbThree: 'left-[25%] bottom-[-7rem] h-80 w-80 bg-blue-300/24 dark:bg-blue-500/18',
    beam: 'bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.58),transparent_55%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_58%)]',
    ribbonOne: 'top-[-10%] left-[12%] h-[24rem] w-[24rem] bg-cyan-300/18 dark:bg-cyan-500/12',
    ribbonTwo: 'bottom-[-12%] right-[8%] h-[26rem] w-[26rem] bg-emerald-300/16 dark:bg-emerald-500/12',
  },
  public: {
    base: 'bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.10),transparent_28%)] dark:bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.18),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(16,185,129,0.14),transparent_28%)]',
    grid: 'opacity-60 dark:opacity-30',
    orbOne: 'left-[-7rem] top-20 h-72 w-72 bg-cyan-300/35 dark:bg-cyan-500/20',
    orbTwo: 'right-[-6rem] top-1/3 h-80 w-80 bg-emerald-300/30 dark:bg-emerald-500/20',
    orbThree: 'left-1/3 bottom-[-7rem] h-72 w-72 bg-blue-300/20 dark:bg-blue-500/15',
    beam: 'bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.45),transparent_55%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.08),transparent_55%)]',
  },
  auth: {
    base: 'bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.14),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.12),transparent_28%)] dark:bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.16),transparent_32%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.14),transparent_28%)]',
    grid: 'opacity-50 dark:opacity-25',
    orbOne: 'left-[-6rem] top-24 h-72 w-72 bg-blue-300/30 dark:bg-blue-500/18',
    orbTwo: 'right-[-5rem] top-16 h-64 w-64 bg-indigo-300/28 dark:bg-indigo-500/18',
    orbThree: 'left-1/4 bottom-[-6rem] h-72 w-72 bg-cyan-300/20 dark:bg-cyan-500/14',
    beam: 'bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.5),transparent_58%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_58%)]',
  },
  admin: {
    base: 'bg-[radial-gradient(circle_at_top_right,rgba(14,165,233,0.08),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.08),transparent_24%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.10),transparent_26%),radial-gradient(circle_at_bottom_left,rgba(99,102,241,0.12),transparent_24%)]',
    grid: 'opacity-40 dark:opacity-20',
    orbOne: 'left-[-8rem] top-16 h-80 w-80 bg-cyan-300/20 dark:bg-cyan-500/14',
    orbTwo: 'right-[-8rem] top-1/2 h-96 w-96 bg-indigo-300/18 dark:bg-indigo-500/14',
    orbThree: 'left-1/3 bottom-[-8rem] h-80 w-80 bg-emerald-300/18 dark:bg-emerald-500/12',
    beam: 'bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.35),transparent_60%)] dark:bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.05),transparent_60%)]',
  },
}

const AnimatedBackdrop = ({ variant = 'public' }) => {
  const styles = variantClasses[variant] || variantClasses.public
  const isHero = variant === 'hero'
  const sparkles = isHero
    ? [
        'left-[10%] top-[18%]',
        'left-[26%] top-[10%]',
        'right-[24%] top-[22%]',
        'right-[12%] top-[34%]',
        'left-[20%] bottom-[22%]',
        'right-[18%] bottom-[18%]',
      ]
    : []

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${styles.base}`}
    >
      <div className={`ambient-grid absolute inset-0 ${styles.grid}`} />
      {isHero ? (
        <>
          <div className={`ambient-ribbon absolute rounded-full blur-3xl ${styles.ribbonOne}`} />
          <div className={`ambient-ribbon ambient-ribbon-delay absolute rounded-full blur-3xl ${styles.ribbonTwo}`} />
        </>
      ) : null}
      <div className={`ambient-orb absolute rounded-full blur-3xl ${styles.orbOne}`} />
      <div className={`ambient-orb ambient-orb-delay absolute rounded-full blur-3xl ${styles.orbTwo}`} />
      <div className={`ambient-orb ambient-orb-reverse absolute rounded-full blur-3xl ${styles.orbThree}`} />
      <div className={`ambient-beam absolute inset-0 ${styles.beam}`} />
      {sparkles.map((position) => (
        <span
          key={position}
          className={`ambient-sparkle absolute h-2 w-2 rounded-full bg-white/80 shadow-[0_0_24px_rgba(255,255,255,0.8)] dark:bg-cyan-100/70 dark:shadow-[0_0_20px_rgba(103,232,249,0.5)] ${position}`}
        />
      ))}
    </div>
  )
}

export default AnimatedBackdrop
