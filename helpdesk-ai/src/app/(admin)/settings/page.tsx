"use client";

import { useState } from "react";
import { Button, Input } from "@/components/ui";
import { Card, CardContent, CardHeader } from "@/components/ui";
import { PageHeader } from "@/components/layout";

export default function SettingsPage() {
  const [confidenceThreshold, setConfidenceThreshold] = useState("0.65");
  const [maxCategories, setMaxCategories] = useState("10");
  const [reindexing, setReindexing] = useState(false);

  const handleSaveConfig = async () => {
    await fetch("/api/admin/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        confidenceThreshold: parseFloat(confidenceThreshold),
        maxCategories: parseInt(maxCategories),
      }),
    });
    alert("설정이 저장되었습니다.");
  };

  const handleReindex = async () => {
    setReindexing(true);
    try {
      await fetch("/api/admin/reindex", { method: "POST" });
      alert("KB 재색인이 트리거되었습니다.");
    } catch {
      alert("재색인 요청에 실패했습니다.");
    } finally {
      setReindexing(false);
    }
  };

  return (
    <div>
      <PageHeader title="설정" description="시스템 설정 관리" />

      <div className="space-y-6">
        {/* AI 설정 */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">AI 설정</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="신뢰도 임계값 (0.0 ~ 1.0)"
              type="number"
              step="0.05"
              min="0"
              max="1"
              value={confidenceThreshold}
              onChange={(e) => setConfidenceThreshold(e.target.value)}
            />
            <p className="text-xs text-gray-500">
              이 값 미만이면 1차 처리자에게 에스컬레이션됩니다. 높을수록 보수적 (더 많은 건이 에스컬레이션).
            </p>
            <Input
              label="최대 카테고리 수"
              type="number"
              min="1"
              max="20"
              value={maxCategories}
              onChange={(e) => setMaxCategories(e.target.value)}
            />
            <Button onClick={handleSaveConfig}>설정 저장</Button>
          </CardContent>
        </Card>

        {/* KB 관리 */}
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Knowledge Base 관리</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-600">
              피드백 데이터와 새로운 학습 데이터를 KB에 반영하려면 재색인을 실행하세요.
            </p>
            <Button onClick={handleReindex} loading={reindexing} variant="secondary">
              KB 재색인 실행
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
