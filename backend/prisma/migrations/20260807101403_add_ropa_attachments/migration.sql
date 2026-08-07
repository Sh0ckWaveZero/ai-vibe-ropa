-- CreateTable
CREATE TABLE "ropa_attachments" (
    "id" TEXT NOT NULL,
    "ropaRecordId" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "storedName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ropa_attachments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ropa_attachments_ropaRecordId_idx" ON "ropa_attachments"("ropaRecordId");

-- AddForeignKey
ALTER TABLE "ropa_attachments" ADD CONSTRAINT "ropa_attachments_ropaRecordId_fkey" FOREIGN KEY ("ropaRecordId") REFERENCES "ropa_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ropa_attachments" ADD CONSTRAINT "ropa_attachments_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
