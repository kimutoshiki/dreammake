-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_StanceSnapshot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "unitId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "stanceId" TEXT,
    "customLabel" TEXT,
    "strength" INTEGER NOT NULL,
    "reasoning" TEXT NOT NULL,
    "phase" TEXT NOT NULL,
    "source" TEXT NOT NULL DEFAULT 'self',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "StanceSnapshot_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "Unit" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "StanceSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "StanceSnapshot_stanceId_fkey" FOREIGN KEY ("stanceId") REFERENCES "Stance" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_StanceSnapshot" ("createdAt", "customLabel", "id", "phase", "reasoning", "source", "stanceId", "strength", "unitId", "userId") SELECT "createdAt", "customLabel", "id", "phase", "reasoning", "source", "stanceId", "strength", "unitId", "userId" FROM "StanceSnapshot";
DROP TABLE "StanceSnapshot";
ALTER TABLE "new_StanceSnapshot" RENAME TO "StanceSnapshot";
CREATE INDEX "StanceSnapshot_unitId_userId_createdAt_idx" ON "StanceSnapshot"("unitId", "userId", "createdAt");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
