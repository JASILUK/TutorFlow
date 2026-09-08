// src/features/students/StudentsPage.tsx
import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Users,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  X,
} from "lucide-react";

import { useStudents } from "./hooks";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button, Card, Skeleton } from "@/components/ui/core-primitives";
import { CreateStudentModal } from "./components/CreateStudentModal";
import { StudentProfileResponse } from "@/types/students";

const PAGE_SIZE = 20;

export const StudentsPage: React.FC = () => {
  const navigate = useNavigate();

  // Filter & Pagination States
  const [page, setPage] = useState<number>(1);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");

  // Create Student Modal State
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);

  // Debounce search input (300ms)
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
      setPage(1); // Reset page on query modification
    }, 300);

    return () => clearTimeout(handler);
  }, [searchTerm]);

  const queryParams = useMemo(() => {
    return {
      page,
      page_size: PAGE_SIZE,
      search: debouncedSearch || undefined,
      subject: selectedSubject || undefined,
    };
  }, [page, debouncedSearch, selectedSubject]);

  const { data, isPending, isError, error, refetch } = useStudents(queryParams);

  const students = data?.items ?? [];
  const totalStudents = data?.total ?? 0;
  const totalPages = data?.total_pages ?? 1;

  // Extract distinct subjects dynamically from currently loaded page (or maintain active selection)
  const availableSubjects = useMemo(() => {
    const set = new Set<string>();
    students.forEach((s) => {
      if (s.subject) set.add(s.subject);
    });
    if (selectedSubject) set.add(selectedSubject);
    return Array.from(set).sort();
  }, [students, selectedSubject]);

  const hasActiveFilters = Boolean(debouncedSearch || selectedSubject);

  const handleClearFilters = () => {
    setSearchTerm("");
    setDebouncedSearch("");
    setSelectedSubject("");
    setPage(1);
  };

  return (
    <PageContainer>
      {/* 1. Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl sm:text-[28px] font-semibold text-[#0F172A] tracking-tight leading-tight">
            Students
          </h1>
          <p className="text-sm text-[#475569] mt-1">
            Manage your students and their learning profiles.
          </p>
        </div>

        <Button
          variant="primary"
          onClick={() => setIsCreateOpen(true)}
          className="gap-2 shrink-0 self-start sm:self-auto"
        >
          <Plus size={16} strokeWidth={2.2} />
          <span>Create student</span>
        </Button>
      </div>

      {/* 2. Directory Toolbar (Search & Filter) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-6">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search
            size={16}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#94A3B8] pointer-events-none"
          />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search students..."
            aria-label="Search students by name or email"
            className="w-full h-10 pl-9 pr-8 text-sm text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg outline-none hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15 transition-colors placeholder:text-[#94A3B8]"
          />
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              aria-label="Clear search input"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#94A3B8] hover:text-[#0F172A] rounded"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Subject Filter Dropdown */}
        <div className="sm:w-56 shrink-0">
          <select
            value={selectedSubject}
            onChange={(e) => {
              setSelectedSubject(e.target.value);
              setPage(1);
            }}
            aria-label="Filter students by subject"
            className="w-full h-10 px-3 text-sm text-[#0F172A] bg-white border border-[#E2E8F0] rounded-lg outline-none hover:border-[#CBD5E1] focus:border-[#315FEA] focus:ring-2 focus:ring-[#315FEA]/15 transition-colors"
          >
            <option value="">All subjects</option>
            {availableSubjects.map((subj) => (
              <option key={subj} value={subj}>
                {subj}
              </option>
            ))}
          </select>
        </div>

        {/* Clear Filters Action */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            onClick={handleClearFilters}
            className="text-xs text-[#64748B] hover:text-[#0F172A] px-2.5 h-10"
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* 3. Main Content Presentation (Loading, Error, Empty, List) */}
      {isPending ? (
        <LoadingSkeletonTable />
      ) : isError ? (
        <DirectoryErrorState error={error} onRetry={() => refetch()} />
      ) : students.length === 0 ? (
        hasActiveFilters ? (
          <NoSearchResultsState onClear={handleClearFilters} />
        ) : (
          <FirstUseEmptyState onCreate={() => setIsCreateOpen(true)} />
        )
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden md:block bg-white rounded-xl border border-[#E2E8F0] overflow-hidden shadow-[0_1px_3px_rgba(15,23,42,0.03)]">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#E2E8F0] bg-[#F8FAFC]/75 text-[12px] font-semibold text-[#64748B] uppercase tracking-wider select-none">
                  <th scope="col" className="py-3 px-6">
                    Student
                  </th>
                  <th scope="col" className="py-3 px-6">
                    Subject
                  </th>
                  <th scope="col" className="py-3 px-6">
                    Level
                  </th>
                  <th scope="col" className="py-3 px-6 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E2E8F0]">
                {students.map((student) => (
                  <StudentTableRow
                    key={student.id}
                    student={student}
                    onOpen={() => navigate(`/dashboard/students/${student.id}`)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Card / Item View */}
          <div className="md:hidden space-y-3">
            {students.map((student) => (
              <StudentMobileCard key={student.id} student={student} />
            ))}
          </div>

          {/* 4. Pagination Controller */}
          <DirectoryPagination
            currentPage={page}
            totalPages={totalPages}
            totalItems={totalStudents}
            onPageChange={(p) => setPage(p)}
          />
        </div>
      )}

      {/* 5. Create Student Modal */}
      <CreateStudentModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </PageContainer>
  );
};

/* ------------------------------------------------------------------ */
/*  Desktop Table Row                                                 */
/* ------------------------------------------------------------------ */
interface RowProps {
  student: StudentProfileResponse;
  onOpen: () => void;
}

const StudentTableRow: React.FC<RowProps> = ({ student, onOpen }) => {
  const fullName = student.student_user?.full_name || "Unassigned Student";
  const email = student.student_user?.email || "No email available";

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <tr className="hover:bg-[#F8FAFC] transition-colors duration-150 group">
      {/* Student Identity Column */}
      <td className="py-3.5 px-6">
        <Link
          to={`/dashboard/students/${student.id}`}
          className="flex items-center gap-3.5 focus:outline-none focus:ring-2 focus:ring-[#315FEA]/30 rounded-lg p-0.5"
        >
          <div className="w-9 h-9 rounded-full bg-[#EEF2FF] text-[#315FEA] border border-[#BFDBFE] flex items-center justify-center font-semibold text-xs select-none shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <span className="block text-sm font-medium text-[#0F172A] group-hover:text-[#315FEA] transition-colors truncate">
              {fullName}
            </span>
            <span className="block text-xs text-[#64748B] truncate">
              {email}
            </span>
          </div>
        </Link>
      </td>

      {/* Subject Column */}
      <td className="py-3.5 px-6 text-sm text-[#0F172A] font-medium">
        {student.subject}
      </td>

      {/* Current Level Column */}
      <td className="py-3.5 px-6 text-sm text-[#475569]">
        {student.current_level}
      </td>

      {/* Action Column */}
      <td className="py-3.5 px-6 text-right">
        <Button
          variant="outline"
          size="sm"
          onClick={onOpen}
          className="text-xs h-8"
        >
          View
        </Button>
      </td>
    </tr>
  );
};

/* ------------------------------------------------------------------ */
/*  Mobile Card Item                                                  */
/* ------------------------------------------------------------------ */
const StudentMobileCard: React.FC<{ student: StudentProfileResponse }> = ({
  student,
}) => {
  const fullName = student.student_user?.full_name || "Unassigned Student";
  const email = student.student_user?.email || "No email available";

  const initials = fullName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Card className="p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#EEF2FF] text-[#315FEA] border border-[#BFDBFE] flex items-center justify-center font-semibold text-xs shrink-0 select-none">
          {initials}
        </div>
        <div className="min-w-0 flex-1">
          <Link
            to={`/dashboard/students/${student.id}`}
            className="block text-sm font-semibold text-[#0F172A] hover:text-[#315FEA] truncate"
          >
            {fullName}
          </Link>
          <span className="block text-xs text-[#64748B] truncate mt-0.5">
            {email}
          </span>
        </div>
      </div>

      <div className="pt-2 border-t border-[#E2E8F0] flex items-center justify-between text-xs text-[#475569]">
        <div>
          <span className="font-medium text-[#0F172A]">{student.subject}</span>
          <span className="mx-1.5 text-[#CBD5E1]" aria-hidden="true">•</span>
          <span>{student.current_level}</span>
        </div>

        <Link
          to={`/dashboard/students/${student.id}`}
          className="font-medium text-[#315FEA] hover:text-[#284FC7] text-xs px-2 py-1 rounded bg-[#EEF2FF]"
        >
          Open
        </Link>
      </div>
    </Card>
  );
};

/* ------------------------------------------------------------------ */
/*  Directory Pagination                                              */
/* ------------------------------------------------------------------ */
interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onPageChange: (page: number) => void;
}

const DirectoryPagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  onPageChange,
}) => {
  if (totalPages <= 1) return null;

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t border-[#E2E8F0]/70 text-xs text-[#64748B] select-none">
      <span>
        Showing page <strong className="text-[#0F172A]">{currentPage}</strong> of{" "}
        <strong className="text-[#0F172A]">{totalPages}</strong> ({totalItems} total students)
      </span>

      <div className="flex items-center gap-1.5">
        <Button
          variant="outline"
          size="sm"
          disabled={currentPage <= 1}
          onClick={() => onPageChange(currentPage - 1)}
          aria-label="Previous page"
          className="gap-1 h-8"
        >
          <ChevronLeft size={14} />
          <span>Previous</span>
        </Button>

        <Button
          variant="outline"
          size="sm"
          disabled={currentPage >= totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          aria-label="Next page"
          className="gap-1 h-8"
        >
          <span>Next</span>
          <ChevronRight size={14} />
        </Button>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Skeleton Loader                                                   */
/* ------------------------------------------------------------------ */
const LoadingSkeletonTable: React.FC = () => (
  <div className="bg-white rounded-xl border border-[#E2E8F0] overflow-hidden p-6 space-y-4">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center justify-between gap-4 py-2">
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-full" />
          <div className="space-y-1.5">
            <Skeleton className="h-4 w-36" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
        <Skeleton className="h-4 w-24 hidden sm:block" />
        <Skeleton className="h-4 w-20 hidden sm:block" />
        <Skeleton className="h-8 w-16 rounded-lg" />
      </div>
    ))}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Empty State: Zero Students Yet                                    */
/* ------------------------------------------------------------------ */
const FirstUseEmptyState: React.FC<{ onCreate: () => void }> = ({
  onCreate,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-16 px-4 bg-white rounded-xl border border-[#E2E8F0] shadow-sm">
    <div className="w-12 h-12 rounded-xl bg-[#EEF2FF] border border-[#BFDBFE]/60 text-[#315FEA] flex items-center justify-center mb-4">
      <Users size={22} strokeWidth={1.8} />
    </div>
    <h3 className="text-base font-semibold text-[#0F172A]">No students yet</h3>
    <p className="mt-1 text-sm text-[#64748B] max-w-sm leading-relaxed">
      Create your first student to start scheduling sessions, tracking homework,
      and logging progress debriefs.
    </p>
    <Button variant="primary" onClick={onCreate} className="mt-5 gap-2">
      <Plus size={16} />
      <span>Create student</span>
    </Button>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Empty State: Search Returned Zero Results                         */
/* ------------------------------------------------------------------ */
const NoSearchResultsState: React.FC<{ onClear: () => void }> = ({
  onClear,
}) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-4 bg-white rounded-xl border border-dashed border-[#CBD5E1]">
    <div className="w-10 h-10 rounded-lg bg-slate-100 text-[#64748B] flex items-center justify-center mb-3">
      <Search size={18} />
    </div>
    <h3 className="text-sm font-semibold text-[#0F172A]">No students found</h3>
    <p className="mt-1 text-xs text-[#64748B] max-w-xs leading-relaxed">
      No student records matched your current query or subject filter.
    </p>
    <Button variant="outline" size="sm" onClick={onClear} className="mt-4 text-xs">
      Clear filters
    </Button>
  </div>
);

/* ------------------------------------------------------------------ */
/*  Error State                                                       */
/* ------------------------------------------------------------------ */
const DirectoryErrorState: React.FC<{
  error: unknown;
  onRetry: () => void;
}> = ({ error, onRetry }) => (
  <div className="flex flex-col items-center justify-center text-center py-14 px-4 bg-white rounded-xl border border-red-200">
    <div className="w-10 h-10 rounded-lg bg-red-50 text-[#DC2626] flex items-center justify-center mb-3 border border-red-100">
      <AlertTriangle size={18} />
    </div>
    <h3 className="text-sm font-semibold text-[#0F172A]">
      Unable to load students
    </h3>
    <p className="mt-1 text-xs text-[#64748B] max-w-xs leading-relaxed">
      {error instanceof Error
        ? error.message
        : "We encountered an issue retrieving your student directory right now."}
    </p>
    <Button
      variant="secondary"
      size="sm"
      onClick={onRetry}
      className="mt-4 gap-1.5 text-xs"
    >
      <RotateCcw size={13} />
      <span>Try again</span>
    </Button>
  </div>
);

export default StudentsPage;