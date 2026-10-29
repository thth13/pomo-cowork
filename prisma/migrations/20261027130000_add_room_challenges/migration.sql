CREATE TABLE "room_challenges" (
    "id" TEXT NOT NULL,
    "roomId" TEXT NOT NULL,
    "title" VARCHAR(80) NOT NULL,
    "targetMinutes" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "room_challenges_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "room_challenges_target_minutes_check" CHECK ("targetMinutes" BETWEEN 5 AND 480)
);

CREATE UNIQUE INDEX "room_challenges_roomId_key" ON "room_challenges"("roomId");

ALTER TABLE "room_challenges" ADD CONSTRAINT "room_challenges_roomId_fkey"
    FOREIGN KEY ("roomId") REFERENCES "rooms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
