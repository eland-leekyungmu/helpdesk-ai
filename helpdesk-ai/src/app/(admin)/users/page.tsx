"use client";

import { useState, useEffect } from "react";
import { User, UserRole } from "@/shared/types";
import { Button, Input, Badge } from "@/components/ui";
import { Card, CardContent, CardHeader, CardFooter } from "@/components/ui";
import { PageHeader } from "@/components/layout";

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [roleFilter, setRoleFilter] = useState<UserRole | "all">("all");

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

  const fetchUsers = async () => {
    try {
      const url = roleFilter === "all" ? "/api/admin/users" : `/api/admin/users?role=${roleFilter}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) setUsers(data.data);
    } catch {
      // 에러 처리
    } finally {
      setLoading(false);
    }
  };

  const roleLabel: Record<UserRole, string> = {
    employee: "임직원",
    agent_l1: "1차 처리자",
    agent_l2: "2차 처리자",
    admin: "관리자",
  };

  return (
    <div>
      <PageHeader
        title="사용자 관리"
        description="임직원 및 처리자 계정 관리"
        actions={<Button onClick={() => setShowCreateModal(true)}>사용자 추가</Button>}
      />

      {/* 역할 필터 */}
      <div className="flex gap-2 mb-4">
        {(["all", "employee", "agent_l1", "agent_l2", "admin"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRoleFilter(r)}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              roleFilter === r ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {r === "all" ? "전체" : roleLabel[r]}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64"><p className="text-gray-500">로딩 중...</p></div>
      ) : (
        <Card>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 font-medium text-gray-500">이름</th>
                    <th className="text-left py-3 font-medium text-gray-500">이메일</th>
                    <th className="text-left py-3 font-medium text-gray-500">역할</th>
                    <th className="text-left py-3 font-medium text-gray-500">소속</th>
                    <th className="text-right py-3 font-medium text-gray-500">작업</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="py-3 font-medium">{user.name}</td>
                      <td className="py-3 text-gray-600">{user.email}</td>
                      <td className="py-3">
                        <Badge variant={user.role === "admin" ? "danger" : user.role.startsWith("agent") ? "info" : "default"}>
                          {roleLabel[user.role]}
                        </Badge>
                      </td>
                      <td className="py-3 text-gray-600">{user.team?.name || "-"}</td>
                      <td className="py-3 text-right">
                        <Button variant="ghost" size="sm">편집</Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 사용자 추가 모달 (간략) */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <h3 className="text-lg font-semibold">사용자 추가</h3>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input label="이름" placeholder="홍길동" />
              <Input label="이메일" type="email" placeholder="name@company.com" />
              <Input label="비밀번호" type="password" placeholder="••••••••" />
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">역할</label>
                <select className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm">
                  <option value="employee">임직원</option>
                  <option value="agent_l1">1차 처리자</option>
                  <option value="agent_l2">2차 처리자</option>
                  <option value="admin">관리자</option>
                </select>
              </div>
            </CardContent>
            <CardFooter>
              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => setShowCreateModal(false)}>취소</Button>
                <Button>추가</Button>
              </div>
            </CardFooter>
          </Card>
        </div>
      )}
    </div>
  );
}
