import {
  FileX,
  CalendarX,
  ClipboardList,
  Calculator,
  Phone,
  BarChart3,
  FolderOpen,
  PieChart,
} from 'lucide-react';
import { FadeIn, StaggerItem } from './animations';

const problems = [
  { icon: FileX, text: 'Lost employee records' },
  { icon: CalendarX, text: 'Leave requests getting forgotten' },
  { icon: ClipboardList, text: 'Manual attendance tracking' },
  { icon: Calculator, text: 'Payroll mistakes' },
  { icon: Phone, text: 'Employees calling HR for simple information' },
  { icon: BarChart3, text: 'Difficulty tracking staff performance' },
  { icon: FolderOpen, text: 'Scattered employee documents' },
  { icon: PieChart, text: 'No proper HR reporting' },
];

export function ProblemSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28 bg-slate-950 text-white">
      <div className="pointer-events-none absolute right-0 top-0 h-64 w-64 rounded-full bg-[#60a5fa]/10 blur-3xl" />
      <div className="pointer-events-none absolute left-0 bottom-0 h-64 w-64 rounded-full bg-[#ec4899]/10 blur-3xl" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-12 lg:grid-cols-2 lg:items-center">
          <FadeIn>
            <div className="rounded-[2rem] border border-white/10 bg-white/5 p-10 shadow-2xl shadow-slate-950/40">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-[#60a5fa] mb-3">
                The Problem
              </p>
              <h2 className="text-3xl font-semibold text-white sm:text-4xl">
                HR Shouldn&apos;t Be This Difficult
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-300">
                If your business still uses Excel, WhatsApp, or paper files to manage employees, you&apos;re probably dealing with daily frustrations that slow your business down.
              </p>
              <p className="mt-5 max-w-xl text-base leading-7 text-slate-300">
                Managing people shouldn&apos;t slow down your business.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {problems.map((item, i) => (
              <StaggerItem key={item.text} delay={i * 80}>
                <div className="flex items-start gap-4 rounded-[1.75rem] border border-white/10 bg-white/5 p-5 transition-all duration-300 hover:-translate-y-1 hover:bg-white/10">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-3xl bg-[#60a5fa]/10 text-[#60a5fa]">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <span className="text-sm leading-6 text-slate-100">{item.text}</span>
                </div>
              </StaggerItem>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
