/** Bangladesh divisions and all 64 districts (English + Bangla). Upazila/area is free text at checkout. */
export const BD_DIVISIONS: { name: string; bn: string; districts: { name: string; bn: string }[] }[] = [
  { name: "Dhaka", bn: "ঢাকা", districts: [
    { name: "Dhaka", bn: "ঢাকা" }, { name: "Faridpur", bn: "ফরিদপুর" }, { name: "Gazipur", bn: "গাজীপুর" }, { name: "Gopalganj", bn: "গোপালগঞ্জ" },
    { name: "Kishoreganj", bn: "কিশোরগঞ্জ" }, { name: "Madaripur", bn: "মাদারীপুর" }, { name: "Manikganj", bn: "মানিকগঞ্জ" }, { name: "Munshiganj", bn: "মুন্সিগঞ্জ" },
    { name: "Narayanganj", bn: "নারায়ণগঞ্জ" }, { name: "Narsingdi", bn: "নরসিংদী" }, { name: "Rajbari", bn: "রাজবাড়ী" }, { name: "Shariatpur", bn: "শরীয়তপুর" },
    { name: "Tangail", bn: "টাঙ্গাইল" } ] },
  { name: "Chattogram", bn: "চট্টগ্রাম", districts: [
    { name: "Bandarban", bn: "বান্দরবান" }, { name: "Brahmanbaria", bn: "ব্রাহ্মণবাড়িয়া" }, { name: "Chandpur", bn: "চাঁদপুর" }, { name: "Chattogram", bn: "চট্টগ্রাম" },
    { name: "Cox's Bazar", bn: "কক্সবাজার" }, { name: "Cumilla", bn: "কুমিল্লা" }, { name: "Feni", bn: "ফেনী" }, { name: "Khagrachhari", bn: "খাগড়াছড়ি" },
    { name: "Lakshmipur", bn: "লক্ষ্মীপুর" }, { name: "Noakhali", bn: "নোয়াখালী" }, { name: "Rangamati", bn: "রাঙ্গামাটি" } ] },
  { name: "Rajshahi", bn: "রাজশাহী", districts: [
    { name: "Bogura", bn: "বগুড়া" }, { name: "Chapainawabganj", bn: "চাঁপাইনবাবগঞ্জ" }, { name: "Joypurhat", bn: "জয়পুরহাট" }, { name: "Naogaon", bn: "নওগাঁ" },
    { name: "Natore", bn: "নাটোর" }, { name: "Pabna", bn: "পাবনা" }, { name: "Rajshahi", bn: "রাজশাহী" }, { name: "Sirajganj", bn: "সিরাজগঞ্জ" } ] },
  { name: "Khulna", bn: "খুলনা", districts: [
    { name: "Bagerhat", bn: "বাগেরহাট" }, { name: "Chuadanga", bn: "চুয়াডাঙ্গা" }, { name: "Jashore", bn: "যশোর" }, { name: "Jhenaidah", bn: "ঝিনাইদহ" },
    { name: "Khulna", bn: "খুলনা" }, { name: "Kushtia", bn: "কুষ্টিয়া" }, { name: "Magura", bn: "মাগুরা" }, { name: "Meherpur", bn: "মেহেরপুর" },
    { name: "Narail", bn: "নড়াইল" }, { name: "Satkhira", bn: "সাতক্ষীরা" } ] },
  { name: "Barishal", bn: "বরিশাল", districts: [
    { name: "Barguna", bn: "বরগুনা" }, { name: "Barishal", bn: "বরিশাল" }, { name: "Bhola", bn: "ভোলা" }, { name: "Jhalokathi", bn: "ঝালকাঠি" },
    { name: "Patuakhali", bn: "পটুয়াখালী" }, { name: "Pirojpur", bn: "পিরোজপুর" } ] },
  { name: "Sylhet", bn: "সিলেট", districts: [
    { name: "Habiganj", bn: "হবিগঞ্জ" }, { name: "Moulvibazar", bn: "মৌলভীবাজার" }, { name: "Sunamganj", bn: "সুনামগঞ্জ" }, { name: "Sylhet", bn: "সিলেট" } ] },
  { name: "Rangpur", bn: "রংপুর", districts: [
    { name: "Dinajpur", bn: "দিনাজপুর" }, { name: "Gaibandha", bn: "গাইবান্ধা" }, { name: "Kurigram", bn: "কুড়িগ্রাম" }, { name: "Lalmonirhat", bn: "লালমনিরহাট" },
    { name: "Nilphamari", bn: "নীলফামারী" }, { name: "Panchagarh", bn: "পঞ্চগড়" }, { name: "Rangpur", bn: "রংপুর" }, { name: "Thakurgaon", bn: "ঠাকুরগাঁও" } ] },
  { name: "Mymensingh", bn: "ময়মনসিংহ", districts: [
    { name: "Jamalpur", bn: "জামালপুর" }, { name: "Mymensingh", bn: "ময়মনসিংহ" }, { name: "Netrokona", bn: "নেত্রকোনা" }, { name: "Sherpur", bn: "শেরপুর" } ] },
];

export const ALL_DISTRICTS = BD_DIVISIONS.flatMap((d) => d.districts.map((x) => x.name));
export const divisionOf = (district: string) => BD_DIVISIONS.find((d) => d.districts.some((x) => x.name === district))?.name ?? "";
