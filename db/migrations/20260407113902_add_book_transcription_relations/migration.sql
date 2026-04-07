/*
  Warnings:

  - A unique constraint covering the columns `[bookId,chapter]` on the table `Transcription` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `bookId` to the `Transcription` table without a default value. This is not possible if the table is not empty.
  - Added the required column `chapter` to the `Transcription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transcription" ADD COLUMN     "bookId" TEXT NOT NULL,
ADD COLUMN     "chapter" INTEGER NOT NULL,
ALTER COLUMN "createdAt" SET DEFAULT CURRENT_TIMESTAMP;

-- CreateTable
CREATE TABLE "Book" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Book_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Transcription_bookId_chapter_key" ON "Transcription"("bookId", "chapter");

-- AddForeignKey
ALTER TABLE "Book" ADD CONSTRAINT "Book_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transcription" ADD CONSTRAINT "Transcription_bookId_fkey" FOREIGN KEY ("bookId") REFERENCES "Book"("id") ON DELETE CASCADE ON UPDATE CASCADE;
