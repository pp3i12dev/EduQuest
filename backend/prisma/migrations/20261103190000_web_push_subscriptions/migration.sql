-- Esta migración agrega tablas sin modificar datos académicos existentes.
CREATE TABLE "WebPushSubscription" (
  "id" SERIAL NOT NULL,
  "userId" INTEGER NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" TEXT NOT NULL,
  "auth" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "disabledAt" TIMESTAMP(3),
  CONSTRAINT "WebPushSubscription_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebPushSubscription_endpoint_key" ON "WebPushSubscription"("endpoint");
CREATE INDEX "WebPushSubscription_userId_disabledAt_idx" ON "WebPushSubscription"("userId", "disabledAt");
ALTER TABLE "WebPushSubscription" ADD CONSTRAINT "WebPushSubscription_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "WebPushDelivery" (
  "id" SERIAL NOT NULL,
  "notificationId" INTEGER NOT NULL,
  "subscriptionId" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "lastError" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  "sentAt" TIMESTAMP(3),
  CONSTRAINT "WebPushDelivery_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "WebPushDelivery_notificationId_subscriptionId_key" ON "WebPushDelivery"("notificationId", "subscriptionId");
CREATE INDEX "WebPushDelivery_status_createdAt_idx" ON "WebPushDelivery"("status", "createdAt");
ALTER TABLE "WebPushDelivery" ADD CONSTRAINT "WebPushDelivery_notificationId_fkey"
  FOREIGN KEY ("notificationId") REFERENCES "Notification"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebPushDelivery" ADD CONSTRAINT "WebPushDelivery_subscriptionId_fkey"
  FOREIGN KEY ("subscriptionId") REFERENCES "WebPushSubscription"("id") ON DELETE CASCADE ON UPDATE CASCADE;
