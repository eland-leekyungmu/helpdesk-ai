"use client";

import { useState, useEffect } from "react";
import { User, UserRole } from "@/shared/types";
import { Button, Input, Card, CardContent, Modal, ModalBody, ModalFooter, SkeletonList, useToast } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import { getUsers } from "@/lib/api";
import { UserPlus, Shield, Headphones, User as UserIcon, Pencil } from "lucide-react";

const ROLE_CONFIG: Record<UserRole, { label: string; className: string; icon: React.ReactNode }> = {
  employee: { label: "임직원",    className: "bg-gray-100 text-gray-700",    icon: <UserIcon size={12} /> },
  agent_l1: { label: "1차 처리자", className: "bg-violet-100 text-violet-700", icon: <Headphones size={12} /> },
  agent_l2: { label: "2차 처리자", className: "bg-purple-100 text-purple-700", icon: <Headphones size={12} /> },
  admin:    { label: "관리자",    className: "bg-indigo-100 text-indigo-700", icon: <Shield size={12} /> },
};

const ROLE_FILTERS = [
  { value: "all",      label: "전체" },
  { value: "employee", label: "임직원" },
  { value: "agent_l1", label: "1차 처리자" },
  { value: "agent_l2", label: "2차 처리자" },
  { value: "admin",    label: "관리자" },
] as const;

interface EditForm {
  name: string;
  role: UserRole;
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ name: "", role: "employee" });
  const [saving, setSaving] = useState(false);
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");
  const { showSuccess, showError } = useToast();

  const fetchUsers = () => {
    setLoading(true);
    getUsers(roleFilter === "all" ? undefined : roleFilter).then((data) => {
      setUsers(data);
      setLoading(false);
    });
  };

  useEffect(() => { fetchUsers(); }, [roleFilter]);

  const openEditModal = (user: User) => {
    setEditingUser(user);
    setEditForm({ name: user.name, role: user.role });
  };

  const handleEdit = async () => {
    if (!editingUser) return;
    setSaving(true);
    try {
      const token = typeof window !== "undefined" ? localStorage.getItem("auth_token") : null;
      const res = await fetch(`/api/admin/users/${editingUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ name: editForm.name, role: editForm.role }),
      });
      if (!res.ok) throw new Error();
      showSuccess("사용자 정보가 수정되었습니다.");
      setEditingUser(null);
      fetchUsers();
    } catch {
      showError("수정에 실패했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleCreate = async () => {
    showSuccess("사용자가 추가되었습니다. (실제 API 연동 필요)");
    setShowCreateModal(false);
  };

  return (
    <div className="animate-fade-in">
      <PageHeader
        title="사용자 관리"
        description="임직원 및 처리자 계정 관리"
        actions={
          <Button onClick={() => setShowCreateModal(true)} icon={<UserPlus size={15} />}>
            사용자 추가
          </Button>
        }
      />

      {/* Role Filter */}
      <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
        {ROLE_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setRoleFilter(f.value as UserRole | "all")}
            className={`
              shrink-0 px-3.5 py-1.5 rounded-full text-sm font-medium transition-all
              ${roleFilter === f.value
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-gray-600 border border-gray-200 hover:border-indigo-300 hover:text-indigo-600"
              }
            `}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <SkeletonList count={5} />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">이름</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">이메일</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">역할</th>
                    <th className="text-left px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">소속</th>
                    <th className="text-right px-6 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => {
                    const roleConf = ROLE_CONFIG[user.role];
                    return (
                      <tr key={user.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50 transition-colors">
                        <td className="px-6 py-3.5 font-medium text-gray-900">{user.name}</td>
                        <td className="px-6 py-3.5 text-gray-500">{user.email}</td>
                        <td className="px-6 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${roleConf.className}`}>
                            {roleConf.icon}
                            {roleConf.label}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-gray-500">{user.team?.name || "-"}</td>
                        <td className="px-6 py-3.5 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<Pencil size={13} />}
                            onClick={() => openEditModal(user)}
                          >
                            편집
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 편집 모달 */}
      <Modal
        open={!!editingUser}
        onClose={() => setEditingUser(null)}
        title={`사용자 편집 — ${editingUser?.name}`}
      >
        <ModalBody className="space-y-4">
          <Input
            label="이름"
            value={editForm.name}
            onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="홍길동"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">역할</label>
            <select
              value={editForm.role}
              onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value as UserRole }))}
              className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="employee">임직원</option>
              <option value="agent_l1">1차 처리자</option>
              <option value="agent_l2">2차 처리자</option>
              <option value="admin">관리자</option>
            </select>
          </div>
          <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500">
            <p>이메일: {editingUser?.email}</p>
            <p className="mt-0.5">소속: {editingUser?.team?.name || "미배정"}</p>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setEditingUser(null)}>취소</Button>
          <Button onClick={handleEdit} loading={saving}>저장</Button>
        </ModalFooter>
      </Modal>

      {/* 사용자 추가 모달 */}
      <Modal open={showCreateModal} onClose={() => setShowCreateModal(false)} title="사용자 추가">
        <ModalBody className="space-y-4">
          <Input label="이름" placeholder="홍길동" />
          <Input label="이메일" type="email" placeholder="name@company.com" />
          <Input label="비밀번호" type="password" placeholder="••••••••" />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">역할</label>
            <select className="w-full border border-gray-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="employee">임직원</option>
              <option value="agent_l1">1차 처리자</option>
              <option value="agent_l2">2차 처리자</option>
              <option value="admin">관리자</option>
            </select>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>취소</Button>
          <Button onClick={handleCreate}>추가</Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
