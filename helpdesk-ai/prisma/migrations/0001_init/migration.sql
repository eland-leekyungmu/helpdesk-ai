-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('employee', 'agent_l1', 'agent_l2', 'admin');

-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('open', 'in_progress', 'resolved', 'closed');

-- CreateEnum
CREATE TYPE "TicketPriority" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "CreatedVia" AS ENUM ('web', 'email');

-- CreateEnum
CREATE TYPE "ResolutionType" AS ENUM ('ai_auto', 'agent_l1', 'agent_l2');

-- CreateEnum
CREATE TYPE "MessageVisibility" AS ENUM ('public', 'private');

-- CreateEnum
CREATE TYPE "SenderType" AS ENUM ('user', 'agent_l1', 'agent_l2', 'ai', 'system');

-- CreateEnum
CREATE TYPE "MessageSource" AS ENUM ('web', 'email', 'ai_generated');

-- CreateEnum
CREATE TYPE "ContentType" AS ENUM ('text', 'html');

-- CreateEnum
CREATE TYPE "AssignmentType" AS ENUM ('ai_auto', 'manual', 'reassign');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('active', 'rejected', 'completed');

-- CreateEnum
CREATE TYPE "ModelType" AS ENUM ('lightweight', 'heavy');

-- CreateEnum
CREATE TYPE "LlmRequestType" AS ENUM ('answer_gen', 'routing', 'category', 'synthesis', 'public_transform');

-- CreateEnum
CREATE TYPE "FeedbackRating" AS ENUM ('positive', 'negative');

-- CreateEnum
CREATE TYPE "KbSourceType" AS ENUM ('real_data', 'synthetic', 'feedback');

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "organization_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teams" (
    "id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "code" VARCHAR(20) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'employee',
    "team_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "login_attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" TEXT NOT NULL,
    "ticket_number" VARCHAR(20) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'open',
    "priority" "TicketPriority" NOT NULL DEFAULT 'medium',
    "category" JSONB,
    "requester_id" TEXT NOT NULL,
    "assigned_to" TEXT,
    "created_via" "CreatedVia" NOT NULL,
    "confidence_score" DECIMAL(5,4),
    "resolution_type" "ResolutionType",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "resolved_at" TIMESTAMP(3),

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "messages" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "sender_id" TEXT,
    "sender_type" "SenderType" NOT NULL,
    "visibility" "MessageVisibility" NOT NULL,
    "content" TEXT NOT NULL,
    "content_type" "ContentType" NOT NULL DEFAULT 'text',
    "attachments" JSONB,
    "source" "MessageSource" NOT NULL,
    "ai_original_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_assignments" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "assigned_to" TEXT NOT NULL,
    "assigned_by" TEXT,
    "assignment_type" "AssignmentType" NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'active',
    "rejected_reason" TEXT,
    "suggested_user_id" TEXT,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ticket_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "email_threads" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT NOT NULL,
    "message_id_header" VARCHAR(500) NOT NULL,
    "in_reply_to" VARCHAR(500),
    "references" TEXT,
    "from_email" VARCHAR(255) NOT NULL,
    "subject" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_threads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "llm_usage_logs" (
    "id" TEXT NOT NULL,
    "ticket_id" TEXT,
    "model_name" VARCHAR(100) NOT NULL,
    "model_type" "ModelType" NOT NULL,
    "input_tokens" INTEGER NOT NULL,
    "output_tokens" INTEGER NOT NULL,
    "cost_usd" DECIMAL(10,6) NOT NULL,
    "request_type" "LlmRequestType" NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "llm_usage_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "feedbacks" (
    "id" TEXT NOT NULL,
    "message_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "rating" "FeedbackRating" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "feedbacks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "knowledge_base_entries" (
    "id" TEXT NOT NULL,
    "source_type" "KbSourceType" NOT NULL,
    "question" TEXT NOT NULL,
    "answer" TEXT NOT NULL,
    "category" VARCHAR(100) NOT NULL,
    "is_synthetic" BOOLEAN NOT NULL DEFAULT false,
    "quality_score" DECIMAL(3,2),
    "source_ticket_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "indexed_at" TIMESTAMP(3),

    CONSTRAINT "knowledge_base_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE INDEX "departments_organization_id_is_active_idx" ON "departments"("organization_id", "is_active");

-- CreateIndex
CREATE INDEX "teams_department_id_is_active_idx" ON "teams"("department_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_team_id_role_is_active_idx" ON "users"("team_id", "role", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_ticket_number_key" ON "tickets"("ticket_number");

-- CreateIndex
CREATE INDEX "tickets_requester_id_status_idx" ON "tickets"("requester_id", "status");

-- CreateIndex
CREATE INDEX "tickets_assigned_to_status_idx" ON "tickets"("assigned_to", "status");

-- CreateIndex
CREATE INDEX "tickets_status_created_at_idx" ON "tickets"("status", "created_at");

-- CreateIndex
CREATE INDEX "messages_ticket_id_visibility_idx" ON "messages"("ticket_id", "visibility");

-- CreateIndex
CREATE INDEX "messages_ticket_id_created_at_idx" ON "messages"("ticket_id", "created_at");

-- CreateIndex
CREATE INDEX "ticket_assignments_ticket_id_status_idx" ON "ticket_assignments"("ticket_id", "status");

-- CreateIndex
CREATE INDEX "ticket_assignments_assigned_to_status_idx" ON "ticket_assignments"("assigned_to", "status");

-- CreateIndex
CREATE INDEX "email_threads_message_id_header_idx" ON "email_threads"("message_id_header");

-- CreateIndex
CREATE INDEX "email_threads_ticket_id_idx" ON "email_threads"("ticket_id");

-- CreateIndex
CREATE INDEX "llm_usage_logs_created_at_model_name_idx" ON "llm_usage_logs"("created_at", "model_name");

-- CreateIndex
CREATE INDEX "feedbacks_message_id_idx" ON "feedbacks"("message_id");

-- CreateIndex
CREATE UNIQUE INDEX "feedbacks_message_id_user_id_key" ON "feedbacks"("message_id", "user_id");

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_organization_id_fkey" FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teams" ADD CONSTRAINT "teams_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_team_id_fkey" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_ai_original_id_fkey" FOREIGN KEY ("ai_original_id") REFERENCES "messages"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_assigned_to_fkey" FOREIGN KEY ("assigned_to") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_assignments" ADD CONSTRAINT "ticket_assignments_suggested_user_id_fkey" FOREIGN KEY ("suggested_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "email_threads" ADD CONSTRAINT "email_threads_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "llm_usage_logs" ADD CONSTRAINT "llm_usage_logs_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_message_id_fkey" FOREIGN KEY ("message_id") REFERENCES "messages"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "feedbacks" ADD CONSTRAINT "feedbacks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
