import Link from "next/link";
import { translator } from "@/lib/i18n";
import type { Lang } from "@/lib/types";

/** After the result: two equal options. The call is optional. */
export default function ChooseNext({
  lang,
  hasBooking,
  enrolled,
  price,
  from = false,
}: {
  lang: Lang;
  hasBooking: boolean;
  enrolled: boolean;
  price: number;
  from?: boolean; // several batches to pick from (Class 12 Science): show the lowest price as "from"
}) {
  const p = from ? (lang === "hi" ? `₹${price} से` : `from ₹${price}`) : `₹${price}`;
  const t = translator(lang);
  return (
    <section className="no-print">
      <h2 className="text-2xl md:text-3xl">{t("choose_title")}</h2>
      <p className="mt-1 text-slate-600">{t("choose_sub")}</p>
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-slate-400 bg-white p-5 md:p-6">
          <p className="text-sm font-semibold text-slate-500">
            {t("free")}, {t("optional").toLowerCase()}
          </p>
          <h3 className="mt-1 text-xl">{t("opt_call_t")}</h3>
          <p className="mt-2 flex-1 text-slate-600">{t("opt_call_d")}</p>
          <Link href={hasBooking ? "/dashboard" : "/book-call"} className="btn-ghost mt-5 w-full">
            {hasBooking ? t("ns_wait_t") : t("book_call")}
          </Link>
        </div>
        <div className="flex flex-col rounded-xl bg-brand-800 p-5 text-white md:p-6">
          <p className="text-sm font-semibold text-brand-200">
            {p}, {t("one_time")}
          </p>
          <h3 className="mt-1 text-xl text-white">{enrolled ? t("enrolled_title") : t("opt_batch_t")}</h3>
          <p className="mt-2 flex-1 text-brand-100">{enrolled ? t("enrolled_next") : t("opt_batch_d")}</p>
          <Link href={enrolled ? "/dashboard" : "/batch"} className="btn-accent mt-5 w-full">
            {enrolled ? t("go_dashboard") : from ? t("see_batch") : `${t("join_for")} ₹${price}`}
          </Link>
        </div>
      </div>
    </section>
  );
}
