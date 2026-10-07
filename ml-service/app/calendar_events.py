import datetime

TN_SCHOOL_HOLIDAYS = {
    1: (True, "Pongal Holidays (mid-Jan)"),
    2: (True, "Active"),
    3: (True, "Active (Exams)"),
    4: (False, "Summer Vacation starts"),
    5: (False, "Summer Vacation"),
    6: (True, "School reopens (mid-June)"),
    7: (True, "Active"),
    8: (True, "Active"),
    9: (True, "Active (Quarterly exams)"),
    10: (True, "Active / Deepavali holidays"),
    11: (True, "Active"),
    12: (True, "Active / Half-yearly holidays"),
}

SCHOOL_HOURS_ARRIVAL = [7, 8]
SCHOOL_HOURS_DEPARTURE = [15, 16]

MONTHLY_AVG_TEMP = {
    1: 25.5, 2: 26.5, 3: 28.5, 4: 30.5,
    5: 33.0, 6: 32.5, 7: 30.5, 8: 29.5,
    9: 29.0, 10: 28.0, 11: 26.5, 12: 25.5
}

FESTIVAL_CALENDAR = {
    "Pongal": {
        "dates": ["2025-01-14", "2026-01-14"],
        "description": "Tamil harvest festival",
        "multipliers": {
            "day_before": {"intercity_bus": 2.5, "highway": 1.8, "shopping": 1.5, "residential": 1.1, "office": 0.8},
            "festival_day": {"intercity_bus": 1.0, "highway": 1.2, "shopping": 1.1, "residential": 1.4, "office": 0.2},
            "day_after": {"intercity_bus": 2.0, "highway": 1.5, "shopping": 1.1, "residential": 1.0, "office": 0.8},
        },
        "peak_hour_shift": {"shopping": 18, "intercity_bus": 20},
        "zone_narrative": {
            "Z01": "CMBT sees massive outbound crowds to southern districts.",
            "Z04": "T.Nagar experiences heavy last-minute shopping.",
            "Z12": "Kilambakkam terminus heavily congested with southbound buses."
        }
    },
    "Deepavali": {
        "dates": ["2025-10-20", "2026-11-08"],
        "description": "Festival of lights",
        "multipliers": {
            "day_before": {"shopping": 2.8, "intercity_bus": 2.0, "highway": 1.6, "residential": 1.2, "office": 0.7},
            "festival_day": {"shopping": 1.0, "intercity_bus": 1.0, "highway": 1.0, "residential": 1.6, "office": 0.1},
            "day_after": {"shopping": 1.0, "intercity_bus": 1.8, "highway": 1.5, "residential": 1.0, "office": 0.8},
        },
        "peak_hour_shift": {"shopping": 19, "intercity_bus": 21},
        "zone_narrative": {
            "Z04": "T.Nagar shopping district hits peak capacity; massive delays.",
            "Z01": "CMBT handles peak holiday travel.",
            "Z12": "Kilambakkam terminus highly congested."
        }
    },
    "Christmas": {
        "dates": ["2025-12-25", "2026-12-25"],
        "description": "Christmas",
        "multipliers": {
            "day_before": {"shopping": 1.8, "commercial": 1.4, "residential": 1.2, "office": 0.8},
            "festival_day": {"shopping": 1.2, "commercial": 1.0, "residential": 1.3, "office": 0.2},
            "day_after": {"shopping": 1.1, "commercial": 1.1, "residential": 1.0, "office": 0.9},
        }
    },
    "New Year": {
        "dates": ["2025-01-01", "2026-01-01"],
        "description": "New Year's Day",
        "multipliers": {
            "day_before": {"commercial": 1.5, "beach": 2.5, "residential": 1.2, "office": 0.7},
            "festival_day": {"commercial": 1.2, "beach": 1.8, "residential": 1.2, "office": 0.2},
            "day_after": {"commercial": 1.0, "beach": 1.0, "residential": 1.0, "office": 0.9},
        }
    }
}

# Pre-calculate flat lookup
festival_lookup = {}
for fname, fdata in FESTIVAL_CALENDAR.items():
    for dt_str in fdata["dates"]:
        dt = datetime.datetime.strptime(dt_str, "%Y-%m-%d")
        dt_before = (dt - datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        dt_after = (dt + datetime.timedelta(days=1)).strftime("%Y-%m-%d")
        
        if dt_before not in festival_lookup: festival_lookup[dt_before] = []
        festival_lookup[dt_before].append({"festival_name": fname, "phase": "day_before", "multipliers": fdata["multipliers"]["day_before"]})
        
        if dt_str not in festival_lookup: festival_lookup[dt_str] = []
        festival_lookup[dt_str].append({"festival_name": fname, "phase": "festival_day", "multipliers": fdata["multipliers"]["festival_day"]})
        
        if dt_after not in festival_lookup: festival_lookup[dt_after] = []
        festival_lookup[dt_after].append({"festival_name": fname, "phase": "day_after", "multipliers": fdata["multipliers"]["day_after"]})


def get_calendar_context(ts: datetime.datetime, zone_type: str):
    h = ts.hour
    dow = ts.weekday()
    month = ts.month
    is_weekend = int(dow >= 5)
    is_weekday = 1 - is_weekend
    date_str = str(ts.date())

    f_flag = 0
    f_prox = 0
    f_mult = 1.0
    festival_name = "None"

    if date_str in festival_lookup:
        fi = festival_lookup[date_str][0]
        f_flag = 1
        f_prox = {"day_before": 1, "festival_day": 2, "day_after": 1}.get(fi["phase"], 0)
        f_mult = fi["multipliers"].get(zone_type, 1.0)
        festival_name = f"{fi['festival_name']} ({fi['phase'].replace('_', ' ').title()})"
    
    school_month_active, _ = TN_SCHOOL_HOLIDAYS[month]
    school_act = int(school_month_active and is_weekday and (h in SCHOOL_HOURS_ARRIVAL or h in SCHOOL_HOURS_DEPARTURE))
    office_act = int(is_weekday and h in [8, 9, 17, 18, 19])
    shopping_act = int(h in [17, 18, 19, 20])

    return {
        "hour": h,
        "day_of_week": dow,
        "is_weekend": is_weekend,
        "month": month,
        "season": (month % 12) // 3,
        "day_of_year": ts.timetuple().tm_yday,
        "temperature": float(MONTHLY_AVG_TEMP.get(month, 28.0)),
        "festival_flag": f_flag,
        "festival_proximity": f_prox,
        "festival_multiplier": f_mult,
        "festival_name": festival_name,
        "school_activity": school_act,
        "office_activity": office_act,
        "shopping_activity": shopping_act,
    }
