"""
FairLens — Demo Dataset Generator
Generates two realistic demo CSVs for hackathon presentation:
  1. adult_demo.csv  — Hiring AI dataset (shows gender + race bias clearly)
  2. ibm_hr_demo.csv — HR attrition dataset (shows salary + age bias)

Run:  python3 generate_demo_data.py
"""

import csv
import random
import os

random.seed(42)

DESKTOP = os.path.expanduser("~/Desktop")


# ─────────────────────────────────────────────────────────────
# DATASET 1:  adult_demo.csv  (Adult Income / Hiring AI style)
# ─────────────────────────────────────────────────────────────
def generate_adult_demo(n=1500):
    rows = []
    names_m = ["Arjun","Rahul","Vikram","Aditya","Rohit","Sanjay","Kiran","Manish","Pradeep","Suresh"]
    names_f = ["Priya","Neha","Anjali","Meera","Sita","Riya","Kavya","Divya","Sunita","Pooja"]
    occupations = ["Tech-support","Craft-repair","Other-service","Sales","Exec-managerial",
                   "Prof-specialty","Handlers-cleaners","Machine-op-inspct","Adm-clerical",
                   "Farming-fishing","Transport-moving","Armed-Forces"]
    educations  = ["Bachelors","Some-college","11th","HS-grad","Prof-school",
                   "Assoc-acdm","Assoc-voc","9th","7th-8th","12th","Masters","Doctorate"]
    relationships = ["Wife","Own-child","Husband","Not-in-family","Other-relative","Unmarried"]
    races  = ["White","Asian-Pac-Islander","Amer-Indian-Eskimo","Other","Black"]
    countries = ["India","India","India","India","India","United-States","Germany","China","Mexico","Philippines"]
    marital = ["Married-civ-spouse","Divorced","Never-married","Separated","Widowed"]

    header = ["age","workclass","fnlwgt","education","education-num","marital-status",
              "occupation","relationship","race","sex","capital-gain","capital-loss",
              "hours-per-week","native-country","income"]

    for _ in range(n):
        sex = random.choices(["Male","Female"], weights=[55, 45])[0]
        race = random.choices(races, weights=[60, 15, 5, 5, 15])[0]
        age  = int(random.gauss(38, 13))
        age  = max(18, min(90, age))

        edu_num = random.randint(1, 16)
        edu = educations[min(edu_num - 1, len(educations)-1)]

        occ = random.choice(occupations)
        hours = max(1, int(random.gauss(40, 10)))

        # ── Inject realistic bias ──
        # Base hire probability
        p_hire = 0.24

        # Gender bias: males hired more
        if sex == "Male":
            p_hire += 0.14
        else:
            p_hire -= 0.06

        # Race bias
        if race == "White":
            p_hire += 0.08
        elif race == "Asian-Pac-Islander":
            p_hire += 0.04
        elif race == "Black":
            p_hire -= 0.08
        elif race == "Amer-Indian-Eskimo":
            p_hire -= 0.10

        # Education
        p_hire += (edu_num - 9) * 0.025

        # Age bias: peak 28-45
        if 28 <= age <= 45:
            p_hire += 0.06
        elif age > 55:
            p_hire -= 0.08
        elif age < 25:
            p_hire -= 0.04

        p_hire = max(0.02, min(0.95, p_hire))
        income = ">50K" if random.random() < p_hire else "<=50K"

        cg = random.choice([0, 0, 0, 0, 2174, 5178, 7688, 14084])
        cl = random.choice([0, 0, 0, 1902, 2042, 2824])

        rows.append([
            age,
            random.choice(["Private","Self-emp-not-inc","Self-emp-inc","Federal-gov",
                           "Local-gov","State-gov","Without-pay","Never-worked"]),
            random.randint(12285, 1484705),
            edu,
            edu_num,
            random.choice(marital),
            occ,
            random.choice(relationships),
            race,
            sex,
            cg, cl,
            hours,
            random.choice(countries),
            income
        ])

    path = os.path.join(DESKTOP, "adult_demo.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)

    print(f"  ✅ adult_demo.csv → {path}")
    print(f"     Rows: {n} | Gender bias injected | Race bias injected")
    return path


# ─────────────────────────────────────────────────────────────
# DATASET 2:  ibm_hr_demo.csv  (IBM HR Attrition style)
# ─────────────────────────────────────────────────────────────
def generate_ibm_hr_demo(n=1000):
    departments = ["Sales","Research & Development","Human Resources"]
    job_roles   = ["Sales Executive","Research Scientist","Laboratory Technician",
                   "Manufacturing Director","Healthcare Representative","Manager",
                   "Sales Representative","Research Director","Human Resources"]
    edu_fields  = ["Life Sciences","Other","Medical","Marketing","Technical Degree","Human Resources"]

    header = ["Age","Attrition","BusinessTravel","DailyRate","Department","DistanceFromHome",
              "Education","EducationField","EmployeeCount","EmployeeNumber","EnvironmentSatisfaction",
              "Gender","HourlyRate","JobInvolvement","JobLevel","JobRole","JobSatisfaction",
              "MaritalStatus","MonthlyIncome","MonthlyRate","NumCompaniesWorked","Over18",
              "OverTime","PercentSalaryHike","PerformanceRating","RelationshipSatisfaction",
              "StandardHours","StockOptionLevel","TotalWorkingYears","TrainingTimesLastYear",
              "WorkLifeBalance","YearsAtCompany","YearsInCurrentRole","YearsSinceLastPromotion",
              "YearsWithCurrManager"]

    rows = []
    for i in range(n):
        gender = random.choices(["Male","Female"], weights=[60, 40])[0]
        age    = random.randint(18, 60)
        dept   = random.choice(departments)
        role   = random.choice(job_roles)
        edu    = random.randint(1, 5)

        # Base income — inject gender pay gap
        base_income = random.randint(2000, 8000)
        if gender == "Male":
            base_income = int(base_income * 1.18)   # 18% gender pay gap
        if age > 45:
            base_income = int(base_income * 0.92)   # age discrimination

        # Inject attrition bias
        p_attrition = 0.16
        if gender == "Female":
            p_attrition += 0.06   # women leave more (systemic issue)
        if age < 30:
            p_attrition += 0.10
        if base_income < 3500:
            p_attrition += 0.12
        attrition = "Yes" if random.random() < p_attrition else "No"

        overtime = random.choices(["Yes","No"], weights=[30, 70])[0]
        if gender == "Female" and overtime == "Yes":
            base_income = int(base_income * 0.93)   # overtime pay gap

        rows.append([
            age, attrition,
            random.choice(["Travel_Rarely","Travel_Frequently","Non-Travel"]),
            random.randint(102, 1499),
            dept,
            random.randint(1, 29),
            edu,
            random.choice(edu_fields),
            1,
            i + 1,
            random.randint(1, 4),
            gender,
            random.randint(30, 100),
            random.randint(1, 4),
            random.randint(1, 5),
            role,
            random.randint(1, 4),
            random.choice(["Single","Married","Divorced"]),
            base_income,
            random.randint(2094, 26999),
            random.randint(0, 9),
            "Y",
            overtime,
            random.randint(11, 25),
            random.randint(3, 4),
            random.randint(1, 4),
            80,
            random.randint(0, 3),
            random.randint(0, 40),
            random.randint(0, 6),
            random.randint(1, 4),
            random.randint(0, 40),
            random.randint(0, 18),
            random.randint(0, 15),
            random.randint(0, 17),
        ])

    path = os.path.join(DESKTOP, "ibm_hr_demo.csv")
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(header)
        w.writerows(rows)

    print(f"  ✅ ibm_hr_demo.csv → {path}")
    print(f"     Rows: {n} | Gender pay gap: ~18% | Age bias injected")
    return path


# ─────────────────────────────────────────────────────────────
# RUN
# ─────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print()
    print("  FairLens Demo Data Generator")
    print("  ──────────────────────────────")
    generate_adult_demo(1500)
    generate_ibm_hr_demo(1000)
    print()
    print("  Both CSV files saved to your Desktop.")
    print("  Drag them into FairLens for the demo!")
    print()
