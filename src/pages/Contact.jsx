import { Mail, MapPin, MessageSquare, Phone } from 'lucide-react'
import AnimatedBackdrop from '../components/layout/AnimatedBackdrop'
import PublicNavbar from '../components/layout/PublicNavbar'
import Footer from '../components/layout/Footer'

const contacts = [
  {
    name: 'Hostel Administration',
    description: 'For admissions, room availability, and general hostel operations.',
    email: 'admin@hostelms.local',
    phone: '+880 1700-000001',
  },
  {
    name: 'Resident Support',
    description: 'For maintenance, visitor approvals, and resident support issues.',
    email: 'support@hostelms.local',
    phone: '+880 1700-000002',
  },
  {
    name: 'Accounts Desk',
    description: 'For fees, payment records, and billing clarification.',
    email: 'accounts@hostelms.local',
    phone: '+880 1700-000003',
  },
]

const contactPhotos = [
  {
    src: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80',
    alt: 'Reception desk and support space',
    title: 'Reception & Support',
  },
  {
    src: 'https://images.unsplash.com/photo-1497366412874-3415097a27e7?auto=format&fit=crop&w=1200&q=80',
    alt: 'Professional meeting and help desk area',
    title: 'Administrative Assistance',
  },
  {
    src: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80',
    alt: 'Institutional building exterior',
    title: 'Campus Presence',
  },
]

const Contact = () => {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-slate-50 text-slate-900 transition-colors dark:bg-slate-950 dark:text-slate-100">
      <AnimatedBackdrop variant="public" />

      <div className="relative z-10">
        <PublicNavbar />

        <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
          <section className="grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-200">
                <MessageSquare className="h-4 w-4" />
                Contact HostelMS
              </div>

              <h2 className="mt-6 text-4xl font-black tracking-tight text-slate-900 dark:text-white sm:text-5xl lg:text-6xl">
                Reach the right hostel team quickly.
              </h2>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-600 dark:text-slate-300">
                This page gives admins and residents a clear place to find support contacts. You can keep
                it as a public information page from the home navbar and expand it later with a live
                contact form or support ticket system.
              </p>

              <div className="mt-10 space-y-4">
                <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 text-cyan-300">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Location</p>
                    <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">
                      Ahsanullah University of Science and Technology, Tejgaon Industrial Area, Love Road, Dhaka 1208
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 text-emerald-300">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">General Hotline</p>
                    <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">+880 2-8870422</p>
                  </div>
                </div>

                <div className="flex items-start gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-white/10 dark:bg-white/5">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-fuchsia-500/15 text-fuchsia-300">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">Email</p>
                    <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">hello@hostelms.local</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white/80 p-6 shadow-2xl shadow-slate-200/60 backdrop-blur dark:border-white/10 dark:bg-white/5 dark:shadow-slate-950/20">
              <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50/90 p-6 dark:border-white/10 dark:bg-slate-900/80">
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Support Channels</h3>
                <div className="mt-6 space-y-4">
                  {contacts.map((contact) => (
                    <article
                      key={contact.name}
                      className="rounded-2xl border border-slate-200 bg-white/80 p-5 dark:border-white/10 dark:bg-slate-950/70"
                    >
                      <p className="text-lg font-semibold text-slate-900 dark:text-white">{contact.name}</p>
                      <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">{contact.description}</p>
                      <div className="mt-4 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                        <p className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-cyan-300" />
                          {contact.email}
                        </p>
                        <p className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-emerald-300" />
                          {contact.phone}
                        </p>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </div>
          </section>

          <section className="mt-20 rounded-[2rem] border border-slate-200 bg-slate-100/90 p-8 shadow-2xl shadow-cyan-100/60 dark:border-white/10 dark:bg-slate-900/70 dark:shadow-cyan-950/10">
            <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Quick Message</h3>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
              This form is currently a styled contact section on the public site. If you want, I can wire
              it to a backend API next so messages are stored in the database too.
            </p>

            <div className="mt-8 grid gap-4 md:grid-cols-2">
              <input
                type="text"
                placeholder="Your name"
                className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/50 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500"
              />
              <input
                type="email"
                placeholder="Your email"
                className="rounded-2xl border border-slate-200 bg-white/90 px-5 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/50 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500"
              />
            </div>

            <textarea
              rows="5"
              placeholder="Write your message"
              className="mt-4 w-full rounded-[1.5rem] border border-slate-200 bg-white/90 px-5 py-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-cyan-400/50 dark:border-white/10 dark:bg-slate-950/70 dark:text-white dark:placeholder:text-slate-500"
            />

            <button
              type="button"
              className="mt-6 rounded-2xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Send Message
            </button>
          </section>

          <section className="mt-20">
            <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm uppercase tracking-[0.35em] text-emerald-600 dark:text-emerald-300">Contact Gallery</p>
                <h3 className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">
                  A more welcoming public contact experience.
                </h3>
              </div>
              <p className="max-w-2xl text-sm leading-7 text-slate-500 dark:text-slate-400">
                These visuals help make the contact page feel more complete and approachable while supporting
                the public support and campus information already shown above.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {contactPhotos.map((photo) => (
                <article
                  key={photo.title}
                  className="group overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white/80 shadow-xl shadow-slate-200/60 dark:border-white/10 dark:bg-white/5 dark:shadow-slate-950/20"
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    loading="lazy"
                    className="h-64 w-full object-cover transition duration-700 group-hover:scale-105"
                  />
                  <div className="p-5">
                    <h4 className="text-lg font-semibold text-slate-900 dark:text-white">{photo.title}</h4>
                    <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                      Clear visual presentation supports trust, accessibility, and a stronger first impression.
                    </p>
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

export default Contact
