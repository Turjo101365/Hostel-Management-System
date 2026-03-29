import { Link } from 'react-router-dom'
import { ArrowRight, BedDouble, Building2, ShieldCheck, Sparkles, Users } from 'lucide-react'
import AnimatedBackdrop from '../components/layout/AnimatedBackdrop'
import PublicNavbar from '../components/layout/PublicNavbar'
import Footer from '../components/layout/Footer'

const roomTypes = [
  {
    name: 'Single Room',
    subtitle: 'Quiet private living',
    description: 'A focused setup for students who want privacy, calm study time, and simple day-to-day comfort.',
    capacity: '1 Student',
    highlight: 'Best for quiet study',
    accent: 'bg-cyan-500/15 text-cyan-300 border-cyan-400/20',
    icon: BedDouble,
  },
  {
    name: 'Double Room',
    subtitle: 'Balanced shared space',
    description: 'A practical option for students who want shared living with enough space for daily routines.',
    capacity: '2 Students',
    highlight: 'Popular shared option',
    accent: 'bg-emerald-500/15 text-emerald-300 border-emerald-400/20',
    icon: Users,
  },
  {
    name: 'Triple Room',
    subtitle: 'Community-friendly stay',
    description: 'A more social room arrangement designed for students who prefer an active shared environment.',
    capacity: '3 Students',
    highlight: 'Good for groups',
    accent: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-400/20',
    icon: Building2,
  },
]

const features = [
  'Live room availability can be managed from the admin dashboard',
  'Student room assignments stay connected to hostel records',
  'Blocks, occupancy, and room details can be updated by admins',
]

const roomGalleryPhotos = [
  {
    src: 'https://picsum.photos/seed/hostel-room-portfolio-01/1200/900',
    alt: 'Room gallery photo 1',
    title: 'Single Room Perspective',
    note: 'A calmer room concept for residents who prefer privacy and focus.',
  },
  {
    src: 'https://picsum.photos/seed/hostel-room-portfolio-02/1200/900',
    alt: 'Room gallery photo 2',
    title: 'Shared Room Layout',
    note: 'A more balanced arrangement for practical shared accommodation.',
  },
  {
    src: 'https://picsum.photos/seed/hostel-room-portfolio-03/1200/900',
    alt: 'Room gallery photo 3',
    title: 'Resident Comfort',
    note: 'Comfort, order, and usability remain central to the room experience.',
  },
  {
    src: 'https://picsum.photos/seed/hostel-room-portfolio-04/1200/900',
    alt: 'Room gallery photo 4',
    title: 'Clean Interior Tone',
    note: 'A more professional visual presentation helps define accommodation quality.',
  },
  {
    src: 'https://picsum.photos/seed/hostel-room-portfolio-05/1200/900',
    alt: 'Room gallery photo 5',
    title: 'Natural Light Setup',
    note: 'Well-lit spaces support a calmer and more welcoming environment.',
  },
  {
    src: 'https://picsum.photos/seed/hostel-room-portfolio-06/1200/900',
    alt: 'Room gallery photo 6',
    title: 'Functional Living Space',
    note: 'Practical room organization supports daily resident routines.',
  },
  {
    src: 'https://picsum.photos/seed/hostel-room-portfolio-07/1200/900',
    alt: 'Room gallery photo 7',
    title: 'Group Accommodation View',
    note: 'Shared room concepts can still feel structured, clean, and comfortable.',
  },
  {
    src: 'https://picsum.photos/seed/hostel-room-portfolio-08/1200/900',
    alt: 'Room gallery photo 8',
    title: 'Study-Friendly Corner',
    note: 'Resident rooms should support both comfort and everyday productivity.',
  },
  {
    src: 'https://picsum.photos/seed/hostel-room-portfolio-09/1200/900',
    alt: 'Room gallery photo 9',
    title: 'Modern Room Atmosphere',
    note: 'Consistent visual quality helps communicate stronger facility standards.',
  },
  {
    src: 'https://picsum.photos/seed/hostel-room-portfolio-10/1200/900',
    alt: 'Room gallery photo 10',
    title: 'Accommodation Showcase',
    note: 'A broader gallery helps visitors understand the residential environment.',
  },
]

const PublicRooms = () => {
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
                Public Rooms Page
              </div>

              <h2 className="mt-6 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                Explore the main room options available in HostelMS.
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                This page gives visitors a simple overview of the main room categories. Admins can manage the
                actual room data inside the dashboard, while this public page helps users understand the available
                accommodation styles before signing in.
              </p>

              <div className="mt-10 flex flex-wrap gap-4">
                <Link
                  to="/register"
                  className="inline-flex items-center gap-2 rounded-2xl bg-cyan-500 px-6 py-3 text-base font-semibold text-slate-950 transition hover:bg-cyan-400"
                >
                  Register Now
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/contact"
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 px-6 py-3 text-base font-semibold text-slate-800 transition hover:border-cyan-400/50 hover:bg-white/70 dark:border-white/15 dark:text-white dark:hover:bg-white/5"
                >
                  Contact Hostel Team
                </Link>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-2xl shadow-cyan-100/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-cyan-950/20">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/90 p-6 dark:border-white/10 dark:bg-slate-900/80">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">Room Highlights</p>
                    <h3 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">Why it works</h3>
                  </div>
                </div>

                <div className="mt-8 space-y-4">
                  {features.map((feature) => (
                    <div key={feature} className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-white/10 dark:bg-slate-950/70">
                      <p className="text-sm leading-7 text-slate-600 dark:text-slate-300">{feature}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-20 grid gap-6 md:grid-cols-3">
            {roomTypes.map(({ name, subtitle, description, capacity, highlight, accent, icon: Icon }) => (
              <article
                key={name}
                className="rounded-[1.75rem] border border-slate-200 bg-white/80 p-6 shadow-lg shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-slate-950/20"
              >
                <div className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border ${accent}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <p className="mt-5 text-sm uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">{subtitle}</p>
                <h3 className="mt-3 text-2xl font-semibold text-slate-900 dark:text-white">{name}</h3>
                <p className="mt-4 text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p>

                <div className="mt-6 flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-100/90 px-4 py-3 dark:border-white/10 dark:bg-slate-950/70">
                  <span className="text-sm font-medium text-slate-700 dark:text-slate-300">{capacity}</span>
                  <span className="text-xs uppercase tracking-[0.25em] text-cyan-600 dark:text-cyan-300">{highlight}</span>
                </div>
              </article>
            ))}
          </section>

          <section className="mt-20">
            <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-cyan-600 dark:text-cyan-300">Room Gallery</p>
                <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  Ten additional views for the rooms page.
                </h3>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                This gallery uses a separate image set from the other public pages so the rooms section feels
                distinct and visually focused on accommodation.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-5">
              {roomGalleryPhotos.map((photo) => (
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
        </main>

        <Footer variant="public" />
      </div>
    </div>
  )
}

export default PublicRooms
