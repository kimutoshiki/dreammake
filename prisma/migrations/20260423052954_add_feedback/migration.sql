-- CreateTable
CREATE TABLE "Feedback" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "teacherId" TEXT NOT NULL,
    "artworkId" TEXT,
    "fieldNoteId" TEXT,
    "stamp" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "Feedback_artworkId_idx" ON "Feedback"("artworkId");

-- CreateIndex
CREATE INDEX "Feedback_fieldNoteId_idx" ON "Feedback"("fieldNoteId");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_teacherId_artworkId_stamp_key" ON "Feedback"("teacherId", "artworkId", "stamp");

-- CreateIndex
CREATE UNIQUE INDEX "Feedback_teacherId_fieldNoteId_stamp_key" ON "Feedback"("teacherId", "fieldNoteId", "stamp");
