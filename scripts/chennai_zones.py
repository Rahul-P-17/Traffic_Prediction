"""
Chennai Metropolitan Region — Zone & Road Knowledge Layer
==========================================================
This module defines the geographic, functional, and behavioural characteristics
of all zones and roads in the simulation study area.

DATA CLASSIFICATION:
  All zone characteristics are DOMAIN KNOWLEDGE / SYNTHETIC ASSUMPTIONS
  derived from publicly available information about Chennai's land use,
  transport network, and documented commuting patterns.

  Sources consulted:
  - Chennai Metropolitan Development Authority (CMDA) land-use maps
  - Chennai Unified Metropolitan Transport Authority (CUMTA) reports
  - Tamil Nadu Urban Infrastructure Financial Services (TNUIFSL) studies
  - Academic literature on Chennai traffic patterns
  - Ministry of Road Transport & Highways (MoRTH) road categorisation
  - National Highways Authority of India (NHAI) corridor descriptions
  - Press/news reports on Chennai traffic and festival mobility

IMPORTANT: No field in this file constitutes directly measured traffic data.
All demand intensities, sensitivity values, and multipliers are synthetic
assumptions documented with rationale. They are used solely to produce
research-grounded synthetic training data for demonstration purposes.
"""

# ---------------------------------------------------------------------------
# ZONE TYPE DEFINITIONS
# ---------------------------------------------------------------------------
# zone_type    : primary land-use classification
# sub_types    : secondary uses present in the zone
# demand_base  : relative base demand intensity (0.0–2.0)
#                1.0 = typical arterial road zone
# peak_periods : hours with elevated demand (list of hour ints)
# weekend_factor: ratio of weekend demand vs weekday (e.g., 0.6 = 60% of weekday)
# festival_sensitivity: 0.0–1.0 — how strongly festivals change demand
# weather_sensitivity : 0.0–1.0 — how strongly rain reduces demand/speed
# school_influence: True if school zones significantly drive peak patterns
# office_influence: True if office/IT commuting dominates demand
# shopping_influence: True if shopping/commercial demand is significant
# intercity_influence: True if intercity bus/rail generates significant demand
# description  : human-readable rationale
# ---------------------------------------------------------------------------

ZONE_TYPES = {
    "intercity_bus": {
        "description": "Major intercity/interstate bus terminal and transit hub",
        "demand_base": 1.8,
        "peak_periods": [6, 7, 8, 9, 17, 18, 19, 20, 21],  # boarding/alighting spread
        "weekend_factor": 1.35,   # festivals/holidays increase intercity travel
        "festival_sensitivity": 0.90,   # very high — holiday departures
        "weather_sensitivity": 0.25,    # buses run despite rain
        "school_influence": False,
        "office_influence": False,
        "shopping_influence": False,
        "intercity_influence": True,
    },
    "office": {
        "description": "Office/commercial business district with weekday commuter dominance",
        "demand_base": 1.3,
        "peak_periods": [7, 8, 9, 17, 18, 19],
        "weekend_factor": 0.45,
        "festival_sensitivity": 0.40,
        "weather_sensitivity": 0.40,
        "school_influence": False,
        "office_influence": True,
        "shopping_influence": False,
        "intercity_influence": False,
    },
    "it_corridor": {
        "description": "IT/tech park corridor — extended office hours, cab-heavy",
        "demand_base": 1.4,
        "peak_periods": [8, 9, 10, 18, 19, 20],  # slightly later than typical office
        "weekend_factor": 0.30,
        "festival_sensitivity": 0.35,
        "weather_sensitivity": 0.35,
        "school_influence": False,
        "office_influence": True,
        "shopping_influence": False,
        "intercity_influence": False,
    },
    "school": {
        "description": "School/educational zone — twin morning/afternoon peaks on school days",
        "demand_base": 0.8,
        "peak_periods": [7, 8, 13, 14, 15],
        "weekend_factor": 0.50,
        "festival_sensitivity": 0.20,
        "weather_sensitivity": 0.55,   # parents skip drop-off in heavy rain
        "school_influence": True,
        "office_influence": False,
        "shopping_influence": False,
        "intercity_influence": False,
    },
    "shopping": {
        "description": "Major commercial/shopping area — evening and weekend peaks",
        "demand_base": 1.1,
        "peak_periods": [11, 12, 17, 18, 19, 20],
        "weekend_factor": 1.40,
        "festival_sensitivity": 0.85,   # Deepavali shopping surge well-documented
        "weather_sensitivity": 0.50,
        "school_influence": False,
        "office_influence": False,
        "shopping_influence": True,
        "intercity_influence": False,
    },
    "residential": {
        "description": "Predominantly residential — moderate peaks during commute hours",
        "demand_base": 0.9,
        "peak_periods": [7, 8, 18, 19],
        "weekend_factor": 0.80,
        "festival_sensitivity": 0.30,
        "weather_sensitivity": 0.40,
        "school_influence": False,
        "office_influence": False,
        "shopping_influence": False,
        "intercity_influence": False,
    },
    "highway": {
        "description": "National/state highway corridor — sustained throughput with commuter peaks",
        "demand_base": 1.6,
        "peak_periods": [6, 7, 8, 17, 18, 19],
        "weekend_factor": 0.85,
        "festival_sensitivity": 0.70,   # intercity movement surges before festivals
        "weather_sensitivity": 0.30,    # highway traffic less rain-sensitive
        "school_influence": False,
        "office_influence": False,
        "shopping_influence": False,
        "intercity_influence": True,
    },
    "industrial": {
        "description": "Industrial / SEZ / manufacturing zone — shift-based patterns",
        "demand_base": 1.0,
        "peak_periods": [6, 7, 14, 15, 22, 23],  # three shifts
        "weekend_factor": 0.70,
        "festival_sensitivity": 0.20,
        "weather_sensitivity": 0.25,
        "school_influence": False,
        "office_influence": False,
        "shopping_influence": False,
        "intercity_influence": False,
    },
    "mixed": {
        "description": "Mixed residential/commercial — moderate all-day demand",
        "demand_base": 1.0,
        "peak_periods": [7, 8, 9, 12, 17, 18, 19],
        "weekend_factor": 0.90,
        "festival_sensitivity": 0.45,
        "weather_sensitivity": 0.40,
        "school_influence": True,
        "office_influence": True,
        "shopping_influence": True,
        "intercity_influence": False,
    },
}

# ---------------------------------------------------------------------------
# ZONES — Chennai Metropolitan Region
# ---------------------------------------------------------------------------
# Road capacity values are synthetic assumptions.
# Approximate values based on:
#   - MoRTH guidelines: 2400 PCU/hr per lane for urban roads
#   - Typical Chennai arterial: 2-4 lanes each direction
#   - Highway: 4+ lanes each direction
# Capacities here are indicative for demonstration (vehicles/hour).
# ---------------------------------------------------------------------------

ZONES = [
    # ---- CHENNAI CITY CORE ----
    {
        "zone_id": "Z01",
        "zone_name": "Koyambedu",
        "area_name": "Koyambedu",
        "district": "Chennai",
        "zone_type": "intercity_bus",
        "lat": 13.0692, "lon": 80.1950,
        "roads": [
            {"road_id": "R01A", "road_name": "Koyambedu CMBT Access Road", "capacity": 4500, "road_type": "arterial"},
            {"road_id": "R01B", "road_name": "MTH Road (Koyambedu)", "capacity": 5000, "road_type": "arterial"},
        ],
        "description": "Largest intercity bus terminal in Asia. High intercity + local demand.",
        # Rationale: CMBT handles ~180,000 passengers/day (TNSTC reports).
        # Festival periods see 30-50% surge in departures (news reports, Deepavali 2023).
    },
    {
        "zone_id": "Z02",
        "zone_name": "Anna Nagar",
        "area_name": "Anna Nagar",
        "district": "Chennai",
        "zone_type": "mixed",
        "lat": 13.0850, "lon": 80.2101,
        "roads": [
            {"road_id": "R02A", "road_name": "Anna Nagar 2nd Avenue", "capacity": 4000, "road_type": "arterial"},
            {"road_id": "R02B", "road_name": "Shanthi Colony Road", "capacity": 3500, "road_type": "arterial"},
        ],
        "description": "Planned residential township with significant commercial activity.",
    },
    {
        "zone_id": "Z03",
        "zone_name": "Vadapalani",
        "area_name": "Vadapalani",
        "district": "Chennai",
        "zone_type": "shopping",
        "lat": 13.0500, "lon": 80.2120,
        "roads": [
            {"road_id": "R03A", "road_name": "Arcot Road (Vadapalani)", "capacity": 5500, "road_type": "arterial"},
            {"road_id": "R03B", "road_name": "Vadapalani Murugan Koil Road", "capacity": 3000, "road_type": "minor"},
        ],
        "description": "Major commercial junction; Arcot Road is a busy arterial.",
    },
    {
        "zone_id": "Z04",
        "zone_name": "T. Nagar",
        "area_name": "Thyagaraya Nagar",
        "district": "Chennai",
        "zone_type": "shopping",
        "lat": 13.0418, "lon": 80.2341,
        "roads": [
            {"road_id": "R04A", "road_name": "Pondy Bazaar / Usman Road", "capacity": 4000, "road_type": "arterial"},
            {"road_id": "R04B", "road_name": "North Usman Road", "capacity": 3500, "road_type": "arterial"},
        ],
        "description": "One of India's busiest retail destinations. Festival shopping surge documented.",
        # Rationale: T. Nagar Deepavali shopping — 300-400 crore turnover reported (Hindu, 2023).
        # Evening and weekend demand peaks 2-3x weekday baseline.
    },
    {
        "zone_id": "Z05",
        "zone_name": "Guindy",
        "area_name": "Guindy",
        "district": "Chennai",
        "zone_type": "industrial",
        "lat": 13.0067, "lon": 80.2206,
        "roads": [
            {"road_id": "R05A", "road_name": "GST Road (Guindy)", "capacity": 7000, "road_type": "national_highway"},
            {"road_id": "R05B", "road_name": "Inner Ring Road (Guindy)", "capacity": 5500, "road_type": "ring_road"},
        ],
        "description": "Industrial estate + Anna University. NH48/GST Road passes through.",
    },
    {
        "zone_id": "Z06",
        "zone_name": "Velachery",
        "area_name": "Velachery",
        "district": "Chennai",
        "zone_type": "it_corridor",
        "lat": 12.9815, "lon": 80.2209,
        "roads": [
            {"road_id": "R06A", "road_name": "Velachery Main Road", "capacity": 5000, "road_type": "arterial"},
            {"road_id": "R06B", "road_name": "100 Feet Road (Velachery)", "capacity": 4500, "road_type": "arterial"},
        ],
        "description": "IT and residential mix; MRTS/metro connectivity. Heavy morning/evening commute.",
    },
    {
        "zone_id": "Z07",
        "zone_name": "Adyar",
        "area_name": "Adyar",
        "district": "Chennai",
        "zone_type": "residential",
        "lat": 13.0063, "lon": 80.2574,
        "roads": [
            {"road_id": "R07A", "road_name": "LB Road (Adyar)", "capacity": 4500, "road_type": "arterial"},
            {"road_id": "R07B", "road_name": "TTK Road", "capacity": 4000, "road_type": "arterial"},
        ],
        "description": "Affluent residential zone; significant office commute on LB Road.",
    },
    {
        "zone_id": "Z08",
        "zone_name": "Sholinganallur",
        "area_name": "Sholinganallur",
        "district": "Chennai",
        "zone_type": "it_corridor",
        "lat": 12.9010, "lon": 80.2280,
        "roads": [
            {"road_id": "R08A", "road_name": "OMR (Sholinganallur)", "capacity": 8000, "road_type": "state_highway"},
            {"road_id": "R08B", "road_name": "Rajiv Gandhi Salai (OMR)", "capacity": 7500, "road_type": "state_highway"},
        ],
        "description": "Prime IT corridor on OMR. One of India's highest office density stretches.",
        # Rationale: OMR handles ~300,000 vehicles/day (TNRDC estimates). 
        # Peak hr 8-10am and 6-8pm — cab aggregation documented.
    },
    {
        "zone_id": "Z09",
        "zone_name": "Madhavaram",
        "area_name": "Madhavaram",
        "district": "Chennai",
        "zone_type": "residential",
        "lat": 13.1500, "lon": 80.2300,
        "roads": [
            {"road_id": "R09A", "road_name": "Redhills Road (Madhavaram)", "capacity": 4500, "road_type": "arterial"},
            {"road_id": "R09B", "road_name": "Madhavaram High Road", "capacity": 3500, "road_type": "minor"},
        ],
        "description": "Northern residential and dairy zone; commuters to Chennai city.",
    },
    {
        "zone_id": "Z10",
        "zone_name": "Poonamallee",
        "area_name": "Poonamallee",
        "district": "Tiruvallur",
        "zone_type": "mixed",
        "lat": 13.0462, "lon": 80.1154,
        "roads": [
            {"road_id": "R10A", "road_name": "Poonamallee High Road (NH48)", "capacity": 7500, "road_type": "national_highway"},
            {"road_id": "R10B", "road_name": "Bangalore Trunk Road", "capacity": 6500, "road_type": "national_highway"},
        ],
        "description": "Western gateway; NH48 (Bangalore corridor) passes through.",
    },

    # ---- SOUTHERN CORRIDOR ----
    {
        "zone_id": "Z11",
        "zone_name": "Tambaram",
        "area_name": "Tambaram",
        "district": "Chengalpattu",
        "zone_type": "mixed",
        "lat": 12.9249, "lon": 80.1000,
        "roads": [
            {"road_id": "R11A", "road_name": "GST Road (Tambaram)", "capacity": 7000, "road_type": "national_highway"},
            {"road_id": "R11B", "road_name": "Tambaram–Velachery Road", "capacity": 4500, "road_type": "arterial"},
        ],
        "description": "Major suburb and railway junction. Commuter hub for southern Chennai.",
    },
    {
        "zone_id": "Z12",
        "zone_name": "Kilambakkam",
        "area_name": "Kilambakkam",
        "district": "Chengalpattu",
        "zone_type": "intercity_bus",
        "lat": 12.8877, "lon": 80.0707,
        "roads": [
            {"road_id": "R12A", "road_name": "GST Road (Kilambakkam)", "capacity": 8000, "road_type": "national_highway"},
            {"road_id": "R12B", "road_name": "Kilambakkam SIPCOT Road", "capacity": 3500, "road_type": "arterial"},
        ],
        "description": "New southern Chennai bus terminus; intercity + GST Road throughput.",
        # Rationale: Kilambakkam handles outbound festival traffic for south TN corridors.
        # Documented congestion before Deepavali, Pongal (The Hindu, Times of India).
    },
    {
        "zone_id": "Z13",
        "zone_name": "Vandalur",
        "area_name": "Vandalur",
        "district": "Chengalpattu",
        "zone_type": "highway",
        "lat": 12.9020, "lon": 80.0797,
        "roads": [
            {"road_id": "R13A", "road_name": "GST Road (Vandalur)", "capacity": 8500, "road_type": "national_highway"},
            {"road_id": "R13B", "road_name": "Vandalur–Kelambakkam Road", "capacity": 5000, "road_type": "arterial"},
        ],
        "description": "Zoo corridor on GST Road; important throughput node for southern travel.",
    },
    {
        "zone_id": "Z14",
        "zone_name": "Perungalathur",
        "area_name": "Perungalathur",
        "district": "Chengalpattu",
        "zone_type": "residential",
        "lat": 12.8971, "lon": 80.0872,
        "roads": [
            {"road_id": "R14A", "road_name": "GST Road (Perungalathur)", "capacity": 6000, "road_type": "national_highway"},
            {"road_id": "R14B", "road_name": "Perungalathur Station Road", "capacity": 3000, "road_type": "minor"},
        ],
        "description": "Suburban residential growth corridor near GST Road.",
    },

    # ---- WESTERN/NORTHWESTERN CORRIDOR ----
    {
        "zone_id": "Z15",
        "zone_name": "Sriperumbudur",
        "area_name": "Sriperumbudur",
        "district": "Kancheepuram",
        "zone_type": "industrial",
        "lat": 12.9674, "lon": 79.9478,
        "roads": [
            {"road_id": "R15A", "road_name": "NH48 (Sriperumbudur)", "capacity": 9000, "road_type": "national_highway"},
            {"road_id": "R15B", "road_name": "Sriperumbudur SIPCOT Road", "capacity": 4000, "road_type": "arterial"},
        ],
        "description": "Major SEZ/industrial hub (Samsung, Foxconn etc.); shift-based patterns.",
        # Rationale: Sriperumbudur SEZ employs ~50,000+ workers (SIPCOT reports).
        # Shift starts at 6am, 2pm, 10pm — documented three-shift industrial pattern.
    },
    {
        "zone_id": "Z16",
        "zone_name": "Red Hills",
        "area_name": "Red Hills",
        "district": "Tiruvallur",
        "zone_type": "residential",
        "lat": 13.1924, "lon": 80.1796,
        "roads": [
            {"road_id": "R16A", "road_name": "Red Hills Road", "capacity": 4000, "road_type": "state_highway"},
            {"road_id": "R16B", "road_name": "Ponneri High Road", "capacity": 3500, "road_type": "state_highway"},
        ],
        "description": "Northern residential and water-body corridor; commuter zone.",
    },
    {
        "zone_id": "Z17",
        "zone_name": "Manali",
        "area_name": "Manali",
        "district": "Chennai",
        "zone_type": "industrial",
        "lat": 13.1658, "lon": 80.2659,
        "roads": [
            {"road_id": "R17A", "road_name": "Manali–Redhills Road", "capacity": 5000, "road_type": "state_highway"},
            {"road_id": "R17B", "road_name": "Thiruvottiyur High Road", "capacity": 4500, "road_type": "arterial"},
        ],
        "description": "Petrochemical industrial zone; heavy vehicle traffic, shift patterns.",
    },
]

# ---------------------------------------------------------------------------
# FESTIVAL CALENDAR — Tamil Nadu / Chennai
# ---------------------------------------------------------------------------
# Festival dates are approximate; actual dates vary by Tamil calendar.
# Proximity effects: day_before, festival_day, day_after
#
# Mobility multipliers are SYNTHETIC ASSUMPTIONS with documented rationale.
# They are NOT derived from traffic counts.
#
# Rationale sources:
# - Intercity bus demand surges: TNSTC/SETC operate 500-1000 extra buses for 
#   major festivals (official TNSTC press releases).
# - Shopping surges: Retail federation reports, media coverage.
# - General documentation: The Hindu, Times of India, New Indian Express.
# ---------------------------------------------------------------------------

FESTIVAL_CALENDAR = {
    "Deepavali": {
        "label": "Deepavali (Diwali)",
        "description": "Major festival — largest shopping/intercity travel surge of the year in TN",
        "dates_2025": ["2025-10-20"],
        "dates_2024": ["2024-11-01"],
        "dates_2023": ["2023-11-12"],
        # day_before multipliers (by zone type) — SYNTHETIC ASSUMPTIONS
        # Rationale: Shopping zones see 2-3x normal evening traffic day before.
        # Intercity bus terminal: departure surge (TNSTC operates extra services).
        "multipliers": {
            "day_before": {
                "shopping": 2.2,        # T.Nagar Deepavali eve shopping surge
                "intercity_bus": 1.8,   # departure rush
                "highway": 1.5,         # outbound corridor
                "mixed": 1.3,
                "office": 0.9,          # some early closure
                "it_corridor": 0.9,
                "residential": 1.1,
                "industrial": 1.0,
                "school": 0.4,          # holiday
            },
            "festival_day": {
                "shopping": 1.5,        # early morning, then reduces
                "intercity_bus": 1.2,
                "highway": 0.7,         # generally quieter mid-day
                "mixed": 0.8,
                "office": 0.2,          # public holiday
                "it_corridor": 0.2,
                "residential": 0.9,     # local fireworks/visits
                "industrial": 0.3,
                "school": 0.1,
            },
            "day_after": {
                "shopping": 1.3,        # exchanges, return travel
                "intercity_bus": 1.5,   # return journeys
                "highway": 1.4,
                "mixed": 1.1,
                "office": 0.7,          # many take extra day
                "it_corridor": 0.7,
                "residential": 1.0,
                "industrial": 0.8,
                "school": 0.3,
            },
        },
        "peak_hour_shift": {  # hour shift in peak demand during festival
            "shopping": 20,     # late evening shopping peak
            "intercity_bus": 7, # early morning departures
        },
        "zone_narrative": {
            "Z01": "Koyambedu CMBT sees massive departure queues day-before Deepavali",
            "Z04": "T.Nagar Deepavali shopping — one of India's highest retail turnover days",
            "Z12": "Kilambakkam terminal: surge in southbound intercity buses",
            "Z13": "GST Road: heavy southbound outflow day before and day after",
        },
    },
    "Pongal": {
        "label": "Pongal (Tamil Harvest Festival)",
        "description": "4-day harvest festival; major intercity travel for village visits",
        "dates_2025": ["2025-01-14"],
        "dates_2024": ["2024-01-15"],
        "dates_2023": ["2023-01-15"],
        "multipliers": {
            "day_before": {
                "intercity_bus": 1.9,
                "highway": 1.6,
                "shopping": 1.6,        # Pongal provisions shopping
                "mixed": 1.2,
                "office": 0.8,
                "it_corridor": 0.7,
                "residential": 1.0,
                "industrial": 0.9,
                "school": 0.2,
            },
            "festival_day": {
                "intercity_bus": 0.8,   # most departures done
                "highway": 0.6,
                "shopping": 0.5,
                "mixed": 0.7,
                "office": 0.2,
                "it_corridor": 0.2,
                "residential": 1.1,     # celebrations at home
                "industrial": 0.3,
                "school": 0.1,
            },
            "day_after": {
                "intercity_bus": 1.7,   # return journeys
                "highway": 1.5,
                "shopping": 0.9,
                "mixed": 1.0,
                "office": 0.6,
                "it_corridor": 0.6,
                "residential": 1.0,
                "industrial": 0.7,
                "school": 0.3,
            },
        },
        "peak_hour_shift": {"intercity_bus": 7, "highway": 8},
        "zone_narrative": {
            "Z01": "Koyambedu: high outbound volume for Pongal village visits",
            "Z12": "Kilambakkam: southbound intercity peak before Pongal",
            "Z13": "GST Road: high throughput — corridor to districts",
        },
    },
    "Christmas": {
        "label": "Christmas",
        "description": "National holiday; shopping and entertainment surge, modest intercity",
        "dates_2025": ["2025-12-25"],
        "dates_2024": ["2024-12-25"],
        "dates_2023": ["2023-12-25"],
        "multipliers": {
            "day_before": {
                "shopping": 1.7,
                "intercity_bus": 1.3,
                "highway": 1.2,
                "mixed": 1.3,
                "office": 0.9,
                "it_corridor": 0.9,
                "residential": 1.1,
                "industrial": 1.0,
                "school": 0.2,
            },
            "festival_day": {
                "shopping": 1.2,
                "intercity_bus": 1.1,
                "highway": 0.8,
                "mixed": 1.1,
                "office": 0.2,
                "it_corridor": 0.2,
                "residential": 1.2,
                "industrial": 0.3,
                "school": 0.1,
            },
            "day_after": {
                "shopping": 1.3,
                "intercity_bus": 1.2,
                "highway": 1.1,
                "mixed": 1.0,
                "office": 0.8,
                "it_corridor": 0.8,
                "residential": 1.0,
                "industrial": 0.8,
                "school": 0.5,
            },
        },
        "peak_hour_shift": {"shopping": 19, "intercity_bus": 9},
        "zone_narrative": {
            "Z04": "T.Nagar: Christmas shopping and gift purchases",
            "Z07": "Adyar: church area and Marina beach vicinity — pedestrian + vehicle surge",
        },
    },
    "New Year": {
        "label": "New Year's Eve / New Year",
        "description": "Entertainment and celebration; late-night traffic surge, beach/hotel areas",
        "dates_2025": ["2025-01-01"],
        "dates_2024": ["2024-01-01"],
        "dates_2023": ["2023-01-01"],
        "multipliers": {
            "day_before": {
                "shopping": 1.5,
                "intercity_bus": 1.2,
                "highway": 1.1,
                "mixed": 1.4,
                "office": 0.9,
                "it_corridor": 0.9,
                "residential": 1.2,
                "industrial": 1.0,
                "school": 0.2,
            },
            "festival_day": {
                "shopping": 0.7,        # New Year Day typically quiet
                "intercity_bus": 1.2,
                "highway": 0.9,
                "mixed": 0.8,
                "office": 0.2,
                "it_corridor": 0.2,
                "residential": 1.0,
                "industrial": 0.3,
                "school": 0.1,
            },
            "day_after": {
                "shopping": 1.1,
                "intercity_bus": 1.2,
                "highway": 1.0,
                "mixed": 1.0,
                "office": 0.9,
                "it_corridor": 0.9,
                "residential": 1.0,
                "industrial": 0.9,
                "school": 0.8,
            },
        },
        "peak_hour_shift": {"mixed": 22, "residential": 22},  # late-night surge
        "zone_narrative": {
            "Z07": "Adyar/Marina area: late-night celebration traffic",
            "Z03": "Vadapalani: NYE celebrations; late-night peak",
        },
    },
}

# ---------------------------------------------------------------------------
# WEATHER EFFECT PROFILES
# ---------------------------------------------------------------------------
# Effects on traffic speed and road capacity are SYNTHETIC ASSUMPTIONS.
# Rationale:
#   - General principle: rainfall reduces vehicle speeds and increases headways
#   - Studies (e.g., Rakha et al., 2008 TRB; FHWA Weather and Traffic reports)
#     show 10-30% speed reductions in moderate rain, 40-50% in severe conditions
#   - Chennai context: underpasses flood in heavy rain (documented media reports)
#   - Conservative estimates applied; values are configurable
# ---------------------------------------------------------------------------

WEATHER_PROFILES = {
    "clear": {
        "label": "Clear / Dry",
        "speed_factor": 1.00,
        "capacity_factor": 1.00,
        "demand_factor": 1.00,
        "rain_mm_per_hr": 0.0,
    },
    "light_rain": {
        "label": "Light Rain",
        "speed_factor": 0.88,    # ~12% speed reduction
        "capacity_factor": 0.92, # slight capacity reduction
        "demand_factor": 0.95,   # minor demand reduction
        "rain_mm_per_hr": 2.5,
    },
    "moderate_rain": {
        "label": "Moderate Rain",
        "speed_factor": 0.72,    # ~28% speed reduction
        "capacity_factor": 0.80,
        "demand_factor": 0.82,   # many defer non-essential trips
        "rain_mm_per_hr": 10.0,
    },
    "heavy_rain": {
        "label": "Heavy Rain (Chennai Monsoon)",
        "speed_factor": 0.50,    # ~50% speed reduction; flooding risk
        "capacity_factor": 0.62,
        "demand_factor": 0.60,   # significant trip suppression
        "rain_mm_per_hr": 35.0,
        "note": "Chennai NE monsoon (Oct-Dec) can cause localized flooding; "
                "capacity reduction may be higher on low-lying roads.",
    },
    "very_heavy_rain": {
        "label": "Very Heavy Rain (Flood Risk)",
        "speed_factor": 0.30,
        "capacity_factor": 0.45,
        "demand_factor": 0.40,
        "rain_mm_per_hr": 80.0,
        "note": "Extreme Chennai monsoon events; some roads may become impassable.",
    },
}

# ---------------------------------------------------------------------------
# CHENNAI SEASONAL / WEATHER PROBABILITY
# ---------------------------------------------------------------------------
# Monthly weather probability for Chennai, based on IMD climatological normals.
# SYNTHETIC ASSUMPTIONS informed by:
#   - India Meteorological Department (IMD) seasonal patterns
#   - Chennai receives ~1400mm annual rainfall
#   - Northeast monsoon (Oct-Dec) provides ~60% of annual rainfall
#   - Southwest monsoon (Jun-Sep) contributes ~30%
#   - Jan-May: mostly dry with summer heat
# ---------------------------------------------------------------------------

MONTHLY_WEATHER_PROB = {
    # month: {weather_type: probability}
    1:  {"clear": 0.75, "light_rain": 0.20, "moderate_rain": 0.04, "heavy_rain": 0.01, "very_heavy_rain": 0.00},
    2:  {"clear": 0.80, "light_rain": 0.15, "moderate_rain": 0.04, "heavy_rain": 0.01, "very_heavy_rain": 0.00},
    3:  {"clear": 0.82, "light_rain": 0.13, "moderate_rain": 0.04, "heavy_rain": 0.01, "very_heavy_rain": 0.00},
    4:  {"clear": 0.70, "light_rain": 0.20, "moderate_rain": 0.08, "heavy_rain": 0.02, "very_heavy_rain": 0.00},
    5:  {"clear": 0.60, "light_rain": 0.25, "moderate_rain": 0.12, "heavy_rain": 0.03, "very_heavy_rain": 0.00},
    6:  {"clear": 0.50, "light_rain": 0.28, "moderate_rain": 0.16, "heavy_rain": 0.05, "very_heavy_rain": 0.01},
    7:  {"clear": 0.45, "light_rain": 0.30, "moderate_rain": 0.18, "heavy_rain": 0.06, "very_heavy_rain": 0.01},
    8:  {"clear": 0.48, "light_rain": 0.28, "moderate_rain": 0.17, "heavy_rain": 0.06, "very_heavy_rain": 0.01},
    9:  {"clear": 0.45, "light_rain": 0.28, "moderate_rain": 0.18, "heavy_rain": 0.07, "very_heavy_rain": 0.02},
    10: {"clear": 0.35, "light_rain": 0.30, "moderate_rain": 0.22, "heavy_rain": 0.10, "very_heavy_rain": 0.03},
    11: {"clear": 0.30, "light_rain": 0.30, "moderate_rain": 0.25, "heavy_rain": 0.12, "very_heavy_rain": 0.03},
    12: {"clear": 0.45, "light_rain": 0.28, "moderate_rain": 0.18, "heavy_rain": 0.07, "very_heavy_rain": 0.02},
}

# ---------------------------------------------------------------------------
# TAMIL NADU SCHOOL ACADEMIC CALENDAR (approximate)
# ---------------------------------------------------------------------------
# Based on Tamil Nadu government school calendar (approximate).
# SYNTHETIC ASSUMPTION: exact dates vary by year.
# Source: TN School Education Department general pattern.
# ---------------------------------------------------------------------------

TN_SCHOOL_HOLIDAYS = {
    # month: (is_academic_month, description)
    1: (True, "Tamil Nadu schools open after Pongal"),
    2: (True, "Academic term"),
    3: (True, "Academic term"),
    4: (False, "Summer holidays begin (mid-April)"),
    5: (False, "Summer holidays"),
    6: (True, "Schools reopen (mid-June)"),
    7: (True, "Academic term"),
    8: (True, "Academic term"),
    9: (True, "Academic term"),
    10: (True, "Academic term; Deepavali holiday"),
    11: (True, "Academic term"),
    12: (True, "Academic term; Christmas/New Year holiday"),
}

# School hour windows (weekday only, during academic months)
SCHOOL_HOURS_ARRIVAL = [7, 8]      # 7-9 AM
SCHOOL_HOURS_DEPARTURE = [13, 14, 15]  # 1-4 PM

# ---------------------------------------------------------------------------
# TEMPERATURE PROFILE (Chennai, monthly averages) — DOMAIN KNOWLEDGE
# ---------------------------------------------------------------------------
# Source: IMD climatological normals for Chennai
# Used to generate temperature feature; higher temperatures may suppress
# midday non-essential trips (conservative assumption).
# ---------------------------------------------------------------------------

MONTHLY_AVG_TEMP = {
    1: 25.0, 2: 26.0, 3: 28.5, 4: 31.0, 5: 33.0,
    6: 32.0, 7: 31.5, 8: 31.0, 9: 30.5, 10: 28.0,
    11: 26.5, 12: 24.5,
}
MONTHLY_TEMP_RANGE = {  # daily variation
    1: 5, 2: 5, 3: 6, 4: 7, 5: 7,
    6: 4, 7: 3, 8: 3, 9: 4, 10: 5,
    11: 5, 12: 5,
}

# ---------------------------------------------------------------------------
# ROAD CAPACITY UTILISATION TARGETS (configurable)
# ---------------------------------------------------------------------------
# These define what "normal peak" utilisation looks like.
# NOT real measured data — synthetic assumptions.
ROAD_CAPACITY_UTILISATION = {
    "office_peak": 0.82,    # ~82% capacity during weekday office peak
    "shopping_peak": 0.75,
    "highway_peak": 0.70,
    "school_peak": 0.85,
    "off_peak": 0.20,
    "midnight": 0.05,
}
