import Link from 'next/link';
import { Briefcase, Heart, Zap, Users, ArrowRight } from 'lucide-react';

export const metadata = { title: 'Careers — Shaj' };

const VALUES = [
  { icon: Heart, title: 'Customer First', desc: 'Everything we do starts with delivering value to our customers.' },
  { icon: Zap, title: 'Move Fast', desc: 'We ship quickly, learn from feedback, and iterate without fear.' },
  { icon: Users, title: 'Build Together', desc: 'Great work happens in collaborative, inclusive environments.' },
];

const OPEN_ROLES = [
  { title: 'Senior Frontend Engineer', dept: 'Engineering', location: 'Dhaka (Hybrid)', type: 'Full-time' },
  { title: 'Product Manager', dept: 'Product', location: 'Dhaka (Hybrid)', type: 'Full-time' },
  { title: 'UI/UX Designer', dept: 'Design', location: 'Remote', type: 'Full-time' },
  { title: 'Customer Success Specialist', dept: 'Operations', location: 'Dhaka', type: 'Full-time' },
  { title: 'Digital Marketing Manager', dept: 'Marketing', location: 'Dhaka', type: 'Full-time' },
];

export default function CareersPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-12">
      {/* Hero */}
      <div className="text-center mb-14">
        <div className="inline-flex items-center gap-2 bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-4 uppercase tracking-wider">
          <Briefcase className="w-3.5 h-3.5" /> We&apos;re Hiring
        </div>
        <h1 className="text-4xl font-black text-gray-900 mb-4">Join the Shaj Team</h1>
        <p className="text-gray-500 text-lg max-w-xl mx-auto leading-relaxed">
          Help us build Bangladesh&apos;s most loved fashion destination. We&apos;re a small team with big ambitions.
        </p>
      </div>

      {/* Values */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-14">
        {VALUES.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-gray-50 rounded-2xl p-5">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm mb-3">
              <Icon className="w-5 h-5 text-gray-700" />
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{title}</h3>
            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      {/* Open Roles */}
      <div className="mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Open Positions</h2>
        <div className="space-y-3">
          {OPEN_ROLES.map(role => (
            <div key={role.title} className="bg-white border border-gray-100 rounded-2xl p-5 flex items-center justify-between group hover:border-gray-300 transition-colors">
              <div>
                <p className="font-semibold text-gray-900">{role.title}</p>
                <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                  <span>{role.dept}</span>
                  <span>·</span>
                  <span>{role.location}</span>
                  <span>·</span>
                  <span>{role.type}</span>
                </div>
              </div>
              <Link
                href={`/contact?subject=Application: ${encodeURIComponent(role.title)}`}
                className="flex items-center gap-1.5 text-sm font-semibold text-black group-hover:underline"
              >
                Apply <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="bg-gray-900 text-white rounded-2xl p-8 text-center">
        <h3 className="text-xl font-bold mb-2">Don&apos;t see the right role?</h3>
        <p className="text-gray-400 text-sm mb-5">We&apos;re always interested in meeting talented people. Send us your CV and tell us how you can help.</p>
        <Link
          href="/contact"
          className="inline-flex items-center gap-2 bg-white text-black px-6 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-100 transition-colors"
        >
          Get in Touch <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
