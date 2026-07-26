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
    <section className="py-20 sm:py-28 bg-[#f2e9e9]/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-12 lg:grid-cols-2 lg:items-center">
          <FadeIn>
            <div>
              <p className="text-sm font-medium text-[#032364] uppercase tracking-wider mb-3">
                The Problem
              </p>
              <h2 className="text-3xl font-bold text-[#051536] sm:text-4xl">
                HR Shouldn&apos;t Be This Difficult
              </h2>
              <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
                If your business still uses Excel, WhatsApp, or paper files to manage employees,
                you&apos;re probably dealing with daily frustrations that slow your business down.
              </p>
              <p className="mt-4 text-lg font-medium text-[#051536]">
                Managing people shouldn&apos;t slow down your business.
              </p>
            </div>
          </FadeIn>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {problems.map((item, i) => (
              <StaggerItem key={item.text} delay={i * 80}>
                <div className="flex items-center gap-3 rounded-xl border border-red-200/50 bg-white p-4 transition-all duration-300 hover:shadow-md hover:border-red-300/50">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-50">
                    <item.icon className="h-5 w-5 text-red-500" />
                  </div>
                  <span className="text-sm text-[#051536]">{item.text}</span>
                </div>
              </StaggerItem>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
