-- CreateTable
CREATE TABLE "referral_links" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "label" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdById" TEXT NOT NULL,

    CONSTRAINT "referral_links_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_clicks" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_clicks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referral_signups" (
    "id" TEXT NOT NULL,
    "referralId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_signups_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_links_code_key" ON "referral_links"("code");

-- CreateIndex
CREATE INDEX "referral_links_createdById_idx" ON "referral_links"("createdById");

-- CreateIndex
CREATE INDEX "referral_clicks_referralId_createdAt_idx" ON "referral_clicks"("referralId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "referral_clicks_referralId_fingerprint_key" ON "referral_clicks"("referralId", "fingerprint");

-- CreateIndex
CREATE INDEX "referral_signups_referralId_createdAt_idx" ON "referral_signups"("referralId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "referral_signups_referralId_userId_key" ON "referral_signups"("referralId", "userId");

-- AddForeignKey
ALTER TABLE "referral_links" ADD CONSTRAINT "referral_links_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_clicks" ADD CONSTRAINT "referral_clicks_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referral_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_signups" ADD CONSTRAINT "referral_signups_referralId_fkey" FOREIGN KEY ("referralId") REFERENCES "referral_links"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referral_signups" ADD CONSTRAINT "referral_signups_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
