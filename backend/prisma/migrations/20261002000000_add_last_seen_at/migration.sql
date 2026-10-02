-- AlterTable user_states
ALTER TABLE "user_states" 
ADD COLUMN IF NOT EXISTS "lastSeenAt" TIMESTAMP(3);
