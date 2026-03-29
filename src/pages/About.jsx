import { Link } from 'react-router-dom'
import { ArrowRight, BedDouble, Building2, ShieldCheck, Sparkles, Users } from 'lucide-react'
import AnimatedBackdrop from '../components/layout/AnimatedBackdrop'
import PublicNavbar from '../components/layout/PublicNavbar'
import Footer from '../components/layout/Footer'

const highlights = [
  {
    title: 'Smart Room Management',
    description: 'Track room allocation, occupancy, and student records from one admin workspace.',
    icon: BedDouble,
  },
  {
    title: 'Secure Operations',
    description: 'Authentication, password reset, and protected admin routes keep management access controlled.',
    icon: ShieldCheck,
  },
  {
    title: 'Built For Hostel Teams',
    description: 'Administrative teams can manage daily operations without juggling disconnected tools.',
    icon: Users,
  },
]

const stats = [
  { label: 'Students Supported', value: '1.2K+' },
  { label: 'Rooms Managed', value: '150+' },
  { label: 'Admin Coverage', value: '24/7' },
]

const aboutPhotos = [
  {
    src: 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80',
    alt: 'Well-designed shared room interior',
    title: 'Comfortable Living Spaces',
  },
  {
    src: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?auto=format&fit=crop&w=1200&q=80',
    alt: 'Clean modern hostel room',
    title: 'Organized Accommodation',
  },
  {
    src: 'https://images.unsplash.com/photo-1494526585095-c41746248156?auto=format&fit=crop&w=1200&q=80',
    alt: 'Welcoming common area',
    title: 'Shared Community Areas',
  },
]

const About = () => {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <AnimatedBackdrop variant="public" />

      <div className="relative z-10">
        <PublicNavbar />

        <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <section className="grid gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/25 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-700 dark:text-cyan-200">
                <Sparkles className="h-4 w-4" />
                About HostelMS
              </div>

              <h2 className="mt-6 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                A cleaner way to manage hostel life from one connected platform.
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                HostelMS is designed to help administrators manage students, rooms, visitors, payments,
                maintenance, and leave requests with live MSSQL-backed updates. The goal is simple:
                reduce manual work and make every core hostel workflow easier to track.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Contact Our Team
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-6 py-3 text-base font-semibold text-slate-800 transition hover:border-cyan-400/50 hover:bg-white/70 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
                >
                  Back To Home
                </Link>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              {stats.map((item) => (
                <div
                  key={item.label}
                  className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-xl shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-slate-950/20"
                >
                  <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">{item.label}</p>
                  <p className="mt-4 text-4xl font-black text-slate-900 dark:text-white">{item.value}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-20 grid gap-6 md:grid-cols-3">
            {highlights.map(({ title, description, icon: Icon }) => (
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

          <section className="mt-20">
            <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-600 dark:text-cyan-300">Photo Overview</p>
                <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  A clearer picture of the hostel experience.
                </h3>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                These visuals help present the kind of accommodation, order, and community experience
                the platform is designed to support.
              </p>
            </div>

            <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <article className="group relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white/80 shadow-2xl shadow-slate-200/60 dark:border-white/10 dark:bg-white/5 dark:shadow-slate-950/20">
                <img
                  src={aboutPhotos[0].src}
                  alt={aboutPhotos[0].alt}
                  loading="lazy"
                  className="h-[420px] w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-slate-950/85 to-transparent p-8">
                  <p className="text-sm uppercase tracking-[0.35em] text-cyan-200">{aboutPhotos[0].title}</p>
                  <p className="mt-3 max-w-xl text-sm leading-7 text-slate-200">
                    Clean, comfortable room environments are central to a professional hostel management experience.
                  </p>
                </div>
              </article>

              <div className="grid gap-6">
                {aboutPhotos.slice(1).map((photo) => (
                  <article
                    key={photo.title}
                    className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/80 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-white/5 dark:shadow-slate-950/20"
                  >
                    <img
                      src={photo.src}
                      alt={photo.alt}
                      loading="lazy"
                      className="h-52 w-full object-cover transition duration-700 group-hover:scale-105"
                    />
                    <div className="p-5">
                      <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{photo.title}</h4>
                      <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                        Professional accommodation is supported by clearer visibility into rooms, facilities, and operations.
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section className="mt-20 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-slate-100/90 p-8 shadow-2xl shadow-cyan-100/60 dark:border-white/10 dark:bg-slate-900/80 dark:shadow-cyan-950/10">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                <Building2 className="h-7 w-7" />
              </div>
              <h3 className="mt-6 text-2xl font-bold text-slate-900 dark:text-white">What the system covers</h3>
              <p className="mt-4 text-base leading-8 text-slate-600 dark:text-slate-300">
                The admin dashboard connects student records, room assignments, hostel blocks, mess menu,
                fees, maintenance, and visitor tracking into one workflow. Changes made from the frontend
                are designed to stay synced with the actual database.
              </p>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-8 shadow-2xl shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-slate-950/20">
              <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Why this matters</h3>
              <div className="mt-6 space-y-4">
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-white/10 dark:bg-slate-950/70">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">Fewer manual updates</p>
                  <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                    Admins can update records directly from the portal without relying on scattered spreadsheets.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-white/10 dark:bg-slate-950/70">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">More reliable data</p>
                  <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                    The app is structured so actions from the UI reflect in MSSQL-backed resources.
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-white/10 dark:bg-slate-950/70">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">A better admin experience</p>
                  <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                    Clean navigation helps admins move from the public site into the protected dashboard smoothly.
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>

        <Footer variant="public" />
      </div>
    </div>
  )
}

export default About
