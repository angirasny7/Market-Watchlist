-- AlterEnum
ALTER TYPE "CorporateEventType" ADD VALUE 'EX_DIVIDEND';

-- AlterTable
ALTER TABLE "corporate_events" ADD COLUMN     "isDemo" BOOLEAN NOT NULL DEFAULT false;
