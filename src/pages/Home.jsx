import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Building2,
  ClipboardCheck,
  Database,
  DoorOpen,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { useAuth } from '../auth/AuthContext'
import AnimatedBackdrop from '../components/layout/AnimatedBackdrop'
import PublicNavbar from '../components/layout/PublicNavbar'
import Footer from '../components/layout/Footer'

const featureCards = [
  {
    title: 'Student Records',
    description: 'Manage student profiles, room assignments, and guardian contact details in one place.',
    icon: Users,
  },
  {
    title: 'Room Allocation',
    description: 'Track hostel blocks, occupancy, and availability with live updates from MSSQL.',
    icon: DoorOpen,
  },
  {
    title: 'Secure Admin Access',
    description: 'Use the admin portal for authentication, password reset, and profile management.',
    icon: ShieldCheck,
  },
]

const metricCards = [
  {
    label: 'Live Data Sync',
    value: 'MSSQL',
    note: 'Operational records stay connected to the actual database.',
    icon: Database,
  },
  {
    label: 'Core Admin Modules',
    value: '9+',
    note: 'Students, rooms, visitors, fees, maintenance, and more.',
    icon: ClipboardCheck,
  },
  {
    label: 'Hostel Oversight',
    value: '24/7',
    note: 'A single workspace for daily monitoring and quick decision-making.',
    icon: ShieldCheck,
  },
  {
    label: 'Facility Coverage',
    value: 'Blocks + Rooms',
    note: 'Room allocation and occupancy can be tracked from one platform.',
    icon: Building2,
  },
]

const workflowCards = [
  {
    title: 'Admissions & Registration',
    description: 'Move from public information to registration and secure sign-in without breaking the flow.',
  },
  {
    title: 'Allocation & Tracking',
    description: 'Manage rooms, hostel blocks, and resident assignments with a clearer operational view.',
  },
  {
    title: 'Daily Operations',
    description: 'Keep payments, visitors, maintenance, and leave requests organized inside one system.',
  },
]

const homePhotos = [
  {
    src: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    alt: 'Modern hostel room with clean bedding',
    title: 'Premium Room Layouts',
    note: 'Comfort-first accommodation with practical layouts for residents.',
  },
  {
    src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    alt: 'Well-arranged interior room space',
    title: 'Organized Spaces',
    note: 'A cleaner residential environment supports a better daily routine.',
  },
  {
    src: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
    alt: 'Reception and front desk area',
    title: 'Reception Experience',
    note: 'Public-facing spaces benefit from structure, clarity, and support access.',
  },
  {
    src: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    alt: 'Common area with seating',
    title: 'Shared Community Areas',
    note: 'Hostel life extends beyond rooms into common study and social spaces.',
  },
  {
    src: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1200&q=80',
    alt: 'Bright interior with tables and seating',
    title: 'Functional Interiors',
    note: 'Well-presented facilities strengthen the overall residential experience.',
  },
  {
    src: 'https://images.unsplash.com/photo-1505692952047-1a78307da8f2?auto=format&fit=crop&w=1200&q=80',
    alt: 'Neat room with natural lighting',
    title: 'Resident Comfort',
    note: 'Simple, calm interiors help create a more dependable hostel environment.',
  },
  {
    src: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?auto=format&fit=crop&w=1200&q=80',
    alt: 'Building exterior with modern design',
    title: 'Professional Facilities',
    note: 'A stronger visual identity reinforces trust in the platform and the hostel.',
  },
  {
    src: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=80',
    alt: 'Modern room corner with bed and decor',
    title: 'Clean Presentation',
    note: 'Consistent design standards support a more professional operation.',
  },
  {
    src: 'https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=1200&q=80',
    alt: 'Study-friendly interior setting',
    title: 'Study-Friendly Environment',
    note: 'Residential spaces should support focus as much as comfort.',
  },
  {
    src: 'https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1200&q=80',
    alt: 'Exterior campus walkway and building',
    title: 'Campus Connectivity',
    note: 'Location visibility helps present the hostel as part of a wider ecosystem.',
  },
  {
    src: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1200&q=80',
    alt: 'Bright and polished living room style space',
    title: 'Welcoming Interiors',
    note: 'A polished visual environment helps communicate order and professionalism.',
  },
  {
    src: 'https://images.unsplash.com/photo-1448630360428-65456885c650?auto=format&fit=crop&w=1200&q=80',
    alt: 'Comfortable bedroom with neutral tones',
    title: 'Comfortable Accommodation',
    note: 'Resident comfort is easier to communicate through calm, well-maintained spaces.',
  },
  {
    src: 'https://images.unsplash.com/photo-1480074568708-e7b720bb3f09?auto=format&fit=crop&w=1200&q=80',
    alt: 'Bedroom with modern design elements',
    title: 'Refined Room Design',
    note: 'Thoughtful room presentation supports trust in the overall hostel offering.',
  },
  {
    src: 'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
    alt: 'Modern building exterior under daylight',
    title: 'Strong Exterior Identity',
    note: 'A clear and professional physical environment strengthens first impressions.',
  },
  {
    src: 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?auto=format&fit=crop&w=1200&q=80',
    alt: 'Minimal interior with seating and room decor',
    title: 'Calm Living Atmosphere',
    note: 'Well-balanced interiors help communicate safety, calm, and everyday usability.',
  },
  {
    src: 'https://images.unsplash.com/photo-1464890100898-a385f744067f?auto=format&fit=crop&w=1200&q=80',
    alt: 'Carefully arranged room with natural light',
    title: 'Natural Light & Openness',
    note: 'Well-lit interiors reinforce the sense of comfort and thoughtful facility planning.',
  },
  {
    src: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=1200&q=80',
    alt: 'Warm hospitality-inspired room interior',
    title: 'Hospitality Standards',
    note: 'A residence platform benefits from presenting spaces with hospitality-level care.',
  },
  {
    src: 'https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1200&q=80',
    alt: 'Modern institutional building facade',
    title: 'Professional Setting',
    note: 'Operational systems feel more credible when paired with a strong visual environment.',
  },
  {
    src: 'https://images.unsplash.com/photo-1505409628601-edc9af17fda6?auto=format&fit=crop&w=1200&q=80',
    alt: 'Clean and orderly study or lounge corner',
    title: 'Focused Common Areas',
    note: 'Shared spaces should support both community interaction and productive daily use.',
  },
  {
    src: 'https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1200&q=80',
    alt: 'Professional administrative space',
    title: 'Support & Coordination',
    note: 'Administrative visibility is a key part of creating a dependable resident experience.',
  },
]

const Home = () => {
  const { isAuthenticated } = useAuth()

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <AnimatedBackdrop variant="hero" />

      <div className="relative z-10">
        <PublicNavbar />

        <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <section className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-center">
            <div>
              <div className="mb-6 inline-flex items-center rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-700 dark:text-cyan-200">
                Integrated hostel administration with MSSQL-backed operations
              </div>

              <h2 className="max-w-4xl text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                Comprehensive Hostel Administration from a Single Connected Platform.
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                Review accommodation details, essential information, and support channels before moving
                into a secure sign-in or account creation flow. Once authenticated, administrators can
                manage student records, room allocation, visitors, payments, and daily hostel operations
                from one centralized dashboard.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                {isAuthenticated ? (
                  <Link
                    to="/admin"
                    className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-400"
                  >
                    Go To Dashboard
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                ) : (
                  <>
                    <Link
                      to="/login"
                      className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-400"
                    >
                      Sign In
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                    <Link
                      to="/register"
                      className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-6 py-3 text-base font-semibold text-slate-800 transition hover:border-cyan-400/50 hover:bg-white/70 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
                    >
                      Create Account
                    </Link>
                  </>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-2xl shadow-cyan-950/10 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-cyan-950/20">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/90 p-6 dark:border-white/10 dark:bg-slate-900/80">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Platform Snapshot</p>
                    <h3 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">Administrative Overview</h3>
                  </div>
                  <div className="rounded-2xl bg-emerald-500/15 px-3 py-1 text-sm font-medium text-emerald-300">
                    Operational
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-950/70">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">1. Public Access & Information</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Prospective residents and visitors can review rooms, contact channels, and essential platform information before authentication.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-950/70">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">2. Secure Administrative Entry</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Authorized staff can sign in or create an account to access protected management tools and administrative workflows.</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-950/70">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">3. Centralized Operations</p>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">The dashboard brings together students, rooms, visitors, payments, maintenance, and related processes within one operational workspace.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="mt-16 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            {metricCards.map(({ label, value, note, icon: Icon }) => (
              <article
                key={label}
                className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-6 shadow-lg shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-slate-950/20"
              >
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">{label}</p>
                    <p className="mt-3 text-2xl font-black text-slate-900 dark:text-white">{value}</p>
                  </div>
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-300">
                    <Icon className="h-6 w-6" />
                  </div>
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{note}</p>
              </article>
            ))}
          </section>

          <section className="mt-20 grid gap-6 md:grid-cols-3">
            {featureCards.map(({ title, description, icon: Icon }) => (
              <article
                key={title}
                className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-lg shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-slate-950/20"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300">
                  <Icon className="h-6 w-6" />
                </div>
                <h3 className="mt-6 text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
                <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p>
              </article>
            ))}
          </section>

          <section className="mt-20 grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-100/90 p-8 shadow-2xl shadow-cyan-100/60 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-cyan-950/10">
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-600 dark:text-cyan-300">Operations Workflow</p>
              <h3 className="mt-4 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                A more professional control flow for modern hostel administration.
              </h3>
              <p className="mt-5 text-base leading-8 text-slate-600 dark:text-slate-300">
                HostelMS is structured to reduce friction between public access, admin authentication,
                and day-to-day operational management. The result is a cleaner experience for both
                visitors and administrators.
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Learn More
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/rooms"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-800 transition hover:border-cyan-400/50 hover:bg-white/70 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
                >
                  View Rooms
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              {workflowCards.map((item, index) => (
                <article
                  key={item.title}
                  className="rounded-[1.5rem] border border-slate-200 bg-white/85 p-6 shadow-lg shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-slate-950/20"
                >
                  <div className="flex items-start gap-4">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-500/15 text-sm font-black text-emerald-700 dark:text-emerald-300">
                      0{index + 1}
                    </div>
                    <div>
                      <h4 className="text-xl font-semibold text-slate-900 dark:text-white">{item.title}</h4>
                      <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{item.description}</p>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-20">
            <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-600 dark:text-cyan-300">Visual Gallery</p>
                <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  A broader look at the hostel experience.
                </h3>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                These photos help present the atmosphere, accommodation quality, and operational environment
                behind the platform in a more complete and professional way.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
              {homePhotos.map((photo) => (
                <article
                  key={photo.title}
                  className="group overflow-hidden rounded-[1.6rem] border border-slate-200 bg-white/85 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-slate-950/20"
                >
                  <div className="overflow-hidden">
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      loading="lazy"
                      className="h-56 w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                  </div>
                  <div className="p-5">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{photo.title}</h4>
                    <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">{photo.note}</p>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className="mt-20 grid gap-6 lg:grid-cols-2">
            <Link
              to="/about"
              className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-8 shadow-lg shadow-slate-200/60 backdrop-blur transition hover:border-cyan-400/40 hover:bg-white dark:border-white/10 dark:bg-white/5 dark:shadow-slate-950/20 dark:hover:bg-white/10"
            >
              <p className="text-sm uppercase tracking-[0.35em] text-cyan-600 dark:text-cyan-300">About</p>
              <h3 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Learn how HostelMS supports daily hostel operations.</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Visit the about page to see what the platform covers and why the admin workflow is structured this way.
              </p>
            </Link>

            <Link
              to="/contact"
              className="rounded-[1.75rem] border border-slate-200 bg-slate-100/90 p-8 shadow-lg shadow-emerald-100/50 transition hover:border-emerald-400/40 hover:bg-white dark:border-white/10 dark:bg-slate-900/80 dark:shadow-cyan-950/10 dark:hover:bg-slate-900"
            >
              <p className="text-sm uppercase tracking-[0.35em] text-emerald-600 dark:text-emerald-300">Contact</p>
              <h3 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">Need help or want to reach the hostel team?</h3>
              <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                Open the contact page from the navbar or here to see support channels and public hostel contact details.
              </p>
            </Link>
          </section>
        </main>

        <Footer variant="public" />
      </div>
    </div>
  )
}

export default Home
