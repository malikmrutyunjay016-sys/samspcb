import json
import random

# Authentic lists of first names and surnames typical of western Odisha (Bargarh, Sambalpur, Balangir)
female_first = [
    "Nandini", "Preeti", "Sonali", "Archana", "Sital", "Sruti", "Ranju", "Saraswati", "Puja", "Shruti",
    "Sikha", "Ankita", "Sriya", "Abantika", "Durgamashrita", "Tiru Kabir", "Shanti", "Sekh Afrin", "Alisha",
    "Ruchi", "Baby", "Prangya", "Karishma", "Shrutee", "Chinmayee", "Satwaki", "Shibani", "Lipsharani",
    "Preetimayee", "Jhasanetri", "Tulasi", "Bhagyashree", "Baishnabi", "Muskan", "Sania", "Sadantri",
    "Nilima", "Yangyasini", "Srabani", "Sangita", "Sushreeseenu", "Beauty", "Sudeshna", "Pooja", "Baijayanti",
    "Kshireswari", "Arpita", "Sunena", "Jhunuradha", "Lipsa", "Manasi", "Dalismita", "Upama", "Padmini",
    "Rubita", "Surabhi", "Simran", "Situ", "Suman", "Prachi", "Chumki", "Aishwarya", "Parbati", "Anima",
    "Lisa", "Manisha", "Rubina", "Barsharani", "Deeptimayee", "Tikeswari", "Sasmita", "Rekha", "Suchitra",
    "Gunendri", "Sneha", "Shital", "Sujata", "Khusi", "Manika", "Sainee", "Chandrama", "Jyotsna", "Sunita",
    "Namita", "Priti", "Kiran", "Lopita", "Rakshi", "Aliva", "Lovely", "Pallavee", "Anita", "Jeena",
    "Tanushree", "Trupti", "Tamanna", "Sohani", "Chandini", "Sagarika", "Urmila", "Swagatika", "Etishree",
    "Jyotismita", "Minakshi", "Jharana", "Pinaki", "Tanusri", "Suchismita", "Babi", "Lata", "Rina",
    "Jhili", "Lilu", "Punam", "Siddhi", "Soumyarani", "Jogeswari", "Shubhashree", "Gitanjali", "Madhumita",
    "Ipsita", "Brajeshwari", "Jyoti", "Priyanka", "Rashmita", "Lilima", "Payal", "Isha", "Mami", "Bhumisuta",
    "Dibya", "Trisha", "Sujata", "Kalyani", "Ritu", "Rosy", "Asha", "Rozy", "Ritu", "Mita", "Kamalini",
    "Kajal", "Shahin", "Saniya", "Niyatee", "Megha", "Sonali", "Jyoti", "Basudha", "Yashaswi", "Ishika",
    "Mahak", "Manasi", "Payal", "Amrita", "Jaenab", "Anisha", "Epsitha", "Khushi", "Reshma", "Bhawani",
    "Subhadra", "Renu", "Sahiba", "Rekha", "Jasthi", "Padmashree", "Sunita", "Laxmi", "Aruna", "Sujata"
]

male_first = [
    "Biswajit", "Aman", "Roshan", "Sushanta", "Nihar", "Shiba", "Debaraj", "Ayush", "Sahil", "Nruparaj",
    "Aditya", "Jasaraj", "Shashanka", "Pritam", "Akash", "Deepak", "Ajit", "Sourav", "Ritik", "Somesh",
    "Belal", "Sambit", "Rahul", "Alok", "Dipak", "Sai Ranjan", "Manish", "Prince", "Swagat", "Ayush",
    "Raj Kumar", "Sanjib", "Subhransu", "Hemanta", "Ashish", "Badal", "Ranjit", "Soumyaranjan", "Bikash",
    "Pinku", "Aryam", "Shambhu", "Rajesh", "Somdev", "Ganesh", "Pupindar", "Ankit", "Manas", "Piyush",
    "Anshuman", "Bhupadev", "Arman", "Chintan", "Chandreswar", "Siloam", "Debashish", "Jagan", "Purendra",
    "Yubaraj", "Girish", "Gopinath", "Siddhanta", "Chhayakanta", "Swadhin", "Sanjay", "Sahil", "Suraj",
    "Ayush", "Binit", "Sahil", "Partha", "Tushara", "Swarit", "Anshuman", "Mukesh", "Bhuban", "Amit",
    "Dulamani", "Barun", "Krishna", "Abhishek", "Shubhranshu", "Prabin", "Ajit", "Kiran", "Swagat",
    "Sumanta", "Malaya", "Amiyaranjan", "Aryan", "Somnath", "Samir", "Pradyumna", "Chandan", "Akash",
    "Chandrasekhar", "Rajiblochan", "Khageswar", "Kunal", "Tuleswar", "Lipun", "Gajanan", "Aloka", "Aju",
    "Satyabasanta", "Akash", "Bapi", "Himesh", "Ajit", "Sarat", "Rabishankar", "Khageswar", "Subham",
    "Umesh", "Rohan", "Sudarshan", "Pratik", "Pradeep", "Omkar", "Bishal", "Shreetam", "Bulu", "Suraj",
    "Krish", "Udaya", "Bibek", "Manoj", "Anuj", "Tanmaya", "Tushar", "Prakash", "Chirag", "Mohan",
    "Anurag", "Tarkesh", "Nikhil", "Pramod", "Tarani", "Papu", "Padmanav", "Ganesh", "Abhaya", "Chandan",
    "Sahid", "Jishan", "Pruthiraj", "Yuvraj", "Surya Pratap", "Dibyansu", "Dolagobinda", "Trilochan",
    "Rajat", "Latesh", "Mitesh", "Sanat", "Smarak", "Pratham", "Binaya", "Bhabesh", "James", "Ovid"
]

surnames = [
    "Meher", "Kumbhar", "Padhan", "Majhi", "Bhue", "Budek", "Naik", "Suna", "Bag", "Bishal", "Bagh",
    "Sethy", "Bhoi", "Chouhan", "Sahu", "Patra", "Nayak", "Barik", "Thapa", "Panda", "Mishra", "Sa",
    "Kharsel", "Dansana", "Swain", "Bariha", "Mahakur", "Khamari", "Pradhan", "Pati", "Dash", "Tandi",
    "Seth", "Gahir", "Pandey", "Biswal", "Debta", "Kishan", "Rana", "Bishi", "Deheri", "Deep", "Gartia",
    "Badhei", "Birtia", "Mirdha", "Bage", "Sendria", "Dharua", "Behera", "Rout", "Bandra", "Panigrahi",
    "Agrawal", "Shah", "Jena", "Dora", "Sabat", "Ratha", "Dhal", "Karna", "Nahak", "Muduli", "Senapati"
]

# Accurate counts per stream from user's master dataset (total exactly 1097)
# 1. ARTS(AEDP): 45
# 2. BA26: 687
# 3. BC26: 61
# 4. BIOSC(AEDP): 29
# 5. BS(B): 32
# 6. BS(P): 90
# 7. BS26 (Computer Science): 64
# 8. COM(AEDP): 63
# 9. PHYSC(AEDP): 26
# Total = 45 + 687 + 61 + 29 + 32 + 90 + 64 + 63 + 26 = 1097

sections = [
    {
        "stream": "Arts",
        "prefix": "ARTS(AEDP)26-",
        "count": 45,
        "subjects": [
            "B.A in English and Translation & digital humanities (AEDP)",
            "B.A in History with Tourism and Hospitality Operations (AEDP)",
            "B.A in Economics and data analytics (AEDP)"
        ],
        "start_roll": 2
    },
    {
        "stream": "Arts",
        "prefix": "BA26-",
        "count": 687,
        "subjects": [
            "Political Science", "Hindi", "Odia", "English", "Economics",
            "Education", "History", "Psychology", "Sociology", "Geography",
            "Philosophy", "Sanskrit"
        ],
        "start_roll": 1
    },
    {
        "stream": "Commerce",
        "prefix": "BC26-",
        "count": 61,
        "subjects": ["Commerce"],
        "start_roll": 1
    },
    {
        "stream": "Biological Science",
        "prefix": "BIOSC(AEDP)26-",
        "count": 29,
        "subjects": [
            "B.SC in Botany with Tissue culture and vertical gardening (AEDP)",
            "B.SC in Zoology and integrative bioscience (AEDP)"
        ],
        "start_roll": 1
    },
    {
        "stream": "Biological Science",
        "prefix": "BS(B)26-",
        "count": 32,
        "subjects": ["Botany", "Zoology"],
        "start_roll": 1
    },
    {
        "stream": "Physical Science",
        "prefix": "BS(P)26-",
        "count": 90,
        "subjects": ["Physics", "Chemistry", "Mathematics", "Statistics"],
        "start_roll": 1
    },
    {
        "stream": "Self Financing",
        "prefix": "BS26-",
        "count": 64,
        "subjects": ["Computer Science"],
        "start_roll": 1
    },
    {
        "stream": "Commerce",
        "prefix": "COM(AEDP)26-",
        "count": 63,
        "subjects": ["B.Com in Banking, Financial Services and Insurance and Commerce (AEDP)"],
        "start_roll": 1
    },
    {
        "stream": "Physical Science",
        "prefix": "PHYSC(AEDP)26-",
        "count": 26,
        "subjects": [
            "B.Sc. in Mathematics & Computing (AEDP)",
            "B.SC in Chemistry and Industrial Chemistry (AEDP)"
        ],
        "start_roll": 1
    }
]

dates = ["23 Jun 2026", "24 Jun 2026", "25 Jun 2026", "21 Jul 2026", "22 Jul 2026", "23 Jul 2026", "30 Jul 2026", "31 Jul 2026", "01 Aug 2026", "13 Aug 2026", "14 Aug 2026", "24 Sep 2026", "25 Sep 2026", "03 Oct 2026"]

students = []
global_id = 1
random.seed(42)

for sec in sections:
    stream = sec["stream"]
    prefix = sec["prefix"]
    count = sec["count"]
    subjects = sec["subjects"]
    start_roll = sec["start_roll"]
    
    for i in range(count):
        roll_num = f"{prefix}{str(start_roll + i).zfill(3)}"
        barcode = f"26D{str(random.randint(100000, 999999))}"
        
        # Gender split: approx 55% female, 45% male in arts/bio, 50/50 in others
        is_female = random.random() < (0.58 if stream == "Arts" else 0.48)
        gender = "Female" if is_female else "Male"
        
        f_name = random.choice(female_first if is_female else male_first)
        s_name = random.choice(surnames)
        name = f"{f_name.upper()} {s_name.upper()}"
        
        # Unique clean email matching name
        email = f"{f_name.lower()}.{s_name.lower()}{random.randint(10, 999)}@gmail.com"
        
        # 10 digit Indian mobile starting with 9, 8, 7, or 6
        mobile_prefix = random.choice(["9", "8", "7", "6"])
        phone = f"+91 {mobile_prefix}{str(random.randint(100000000, 999999999))}"
        
        subject = subjects[i % len(subjects)]
        adm_date = random.choice(dates)
        
        students.append({
            "id": f"sams-{global_id}",
            "rollNumber": roll_num,
            "barcode": barcode,
            "name": name,
            "gender": gender,
            "email": email,
            "phone": phone,
            "stream": stream,
            "departmentId": f"dept-{stream.lower().replace(' ', '-')}",
            "departmentName": stream,
            "subject": subject,
            "semester": "1st Semester",
            "admissionDate": adm_date
        })
        global_id += 1

print(f"Total students generated: {len(students)}")

with open("src/data/samsStudents.json", "w") as f:
    json.dump(students, f, indent=2)
print("Saved to src/data/samsStudents.json")
