import { getDoc, getDocs, limit, orderBy, query } from "firebase/firestore";
import type { DailyStat } from "@/types";
import {
    dailyStatDocRef,
    dailyStatsColRef,
} from "@/lib/firebase/paths";
import { dateKey } from "@/lib/utils/date";

const emptyStat = (date: string): DailyStat => ({
    date,
    reviews: 0,
    next: 0,
    repeat: 0,
    known: 0,
    studyMs: 0,
    quizCorrect: 0,
    quizTotal: 0,
});

export async function fetchTodayStat(
    uid: string,
    now: Date = new Date(),
): Promise<DailyStat> {
    const key = dateKey(now);
    const snapshot = await getDoc(dailyStatDocRef(uid, key));
    if (!snapshot.exists()) return emptyStat(key);
    return { ...emptyStat(key), ...(snapshot.data() as Partial<DailyStat>) };
}

/** Most recent `days` entries, oldest first. */
export async function fetchRecentStats(
    uid: string,
    days = 90,
): Promise<DailyStat[]> {
    const snapshot = await getDocs(
        query(dailyStatsColRef(uid), orderBy("date", "desc"), limit(days)),
    );

    return snapshot.docs
        .map((entry) => ({
            ...emptyStat(entry.id),
            ...(entry.data() as Partial<DailyStat>),
        }))
        .reverse();
}
