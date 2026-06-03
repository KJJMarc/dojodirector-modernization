interface BeltRankingsRecentPromotion {
  userId: string;
  studentName: string;
  newRankLabel: string;
  promotionDateLabel: string;
  promotionDateKey: string;
}

interface BeltRankingsRecentPromotionsProps {
  title: string;
  message: string;
  emptyMessage: string;
  promotions: BeltRankingsRecentPromotion[];
}

function RecentPromotionLine({ promotion }: { promotion: BeltRankingsRecentPromotion }) {
  return (
    <li className="list-none border-b border-red-100 py-2 text-[15px] leading-relaxed text-neutral-900 last:border-b-0">
      {promotion.studentName} — {promotion.newRankLabel} — {promotion.promotionDateLabel}
    </li>
  );
}

export function BeltRankingsRecentPromotions({
  title,
  message,
  emptyMessage,
  promotions,
}: BeltRankingsRecentPromotionsProps) {
  return (
    <section className="overflow-hidden rounded-2xl border border-red-100 bg-gradient-to-br from-red-50 via-white to-white shadow-sm">
      <div className="border-l-4 border-red-700 px-5 py-5 sm:px-6">
        <h3 className="text-lg font-bold tracking-tight text-neutral-950">{title}</h3>

        <p className="mt-3 text-sm leading-relaxed text-neutral-600">{message}</p>

        {promotions.length === 0 ? (
          <p className="mt-3 text-sm text-neutral-600">{emptyMessage}</p>
        ) : (
          <ul className="mt-3">
            {promotions.map((promotion) => (
              <RecentPromotionLine
                key={`${promotion.userId}-${promotion.promotionDateKey}-${promotion.newRankLabel}`}
                promotion={promotion}
              />
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
