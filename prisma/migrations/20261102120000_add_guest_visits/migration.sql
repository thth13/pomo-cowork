CREATE TABLE "visitor_identities" (
    "id" TEXT NOT NULL,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    CONSTRAINT "visitor_identities_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "guest_visits" (
    "id" TEXT NOT NULL,
    "ipAddress" VARCHAR(45),
    "countryCode" VARCHAR(2),
    "pagePath" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "guest_visits_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "guest_visits_id_fkey" FOREIGN KEY ("id") REFERENCES "visitor_identities"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "guest_visits_createdAt_id_idx" ON "guest_visits"("createdAt", "id");
