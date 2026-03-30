import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    fallbackLng: 'uz',
    resources: {
      uz: {
        translation: {
          //abought
          about_title: "LOYIHA HAQIDA",
about_mission: "BIZNING MISSIYA",
about_mission_desc: "Mafia Creative Game - bu strategiya, psixologiya va mantiqiy fikrlashni birlashtirgan platforma. Bizning maqsadimiz o'yinchilarga haqiqiy detektiv muhitini his qilish imkonini berishdir.",
about_rules_title: "ASOSIY QOIDALAR",
rule_1: "O'z rolingizni sir saqlang.",
rule_2: "Shahar tinchligi uchun mantiqiy xulosalar qiling.",
rule_3: "Mafiya bo'lsangiz, bildirmasdan harakat qiling.",
about_dev: "ISHLAB CHIQARUVCHI",
system_version: "VERSIYA: 2.0.26 BETA",
          //shop
          shop_status: "Statuslar",
shop_donate: "Donat",
shop_roles: "Rollar",
shop_buy: "Sotib olish",
shop_currency_coin: "Tanga",
shop_currency_star: "Yulduz",
          // Sidebar & Navigation
          home: "Bosh sahifa",
          play: "O'ynash",
          shop: "Do'kon",
          profile: "Profil",
          about: "Haqida",
          day_mode: "Kun rejimi",
          night_mode: "Tun rejimi",
          
          // Hero Section
          welcome: "Xush kelibsiz!",
          home_desc: "Mafia olamiga kirish uchun 'O'ynash' bo'limiga o'ting.",
          select_mode: "Rejimni tanlang",
          single_player: "Bir kishilik o'yin",
          soon: "Tez kunda...",
          shop_title: "Do'kon bo'limi",
          rules: "O'yin qoidalari",

          // Profile Section
          loading: "AGENT ANIQLANMOQDA...",
          credits: "KREDITLAR",
          rank_xp: "REYTINQ XP",
          dashboard: "ASOSIY PANEL",
          mafia_syndicate: "MAFIYA SINDIKATI",
          civilian_defense: "TINCH AHOLI HIMOAYASI",
          winrate: "UMUMIY G'ALABA",
          total_ops: "JAMI OPERATSIYALAR",
          kills: "TASDIQLANGAN QOTILLIKLAR",
          inf_records: "Sizib kirish va neytrallash hisobotlari",
          surv_records: "Strategiya va omon qolish hisobotlari",
          wins: "G'ALABALAR",
          ops: "Operatsiya",
          
          // Roles
          don: "DON (BOSS)",
          enforcer: "MAFIYA (IJROCHI)",
          citizen: "TINCH AHOLI",
          sheriff: "KAMISSAR",
          doctor: "SHIFOKOR",
          system_online: "TIZIM ONLAYN"
        }
      },
      en: {
        translation: {
          //shop
          shop_status: "Statuses",
          shop_donate: "Donate",
shop_roles: "Roles",
shop_buy: "Buy Now",
shop_currency_coin: "Coins",
shop_currency_star: "Stars",
          // Sidebar & Navigation
          home: "Home",
          play: "Play",
          shop: "Shop",
          profile: "Profile",
          about: "About",
          day_mode: "Day Mode",
          night_mode: "Night Mode",

          // Hero Section
          welcome: "Welcome!",
          home_desc: "Go to Play section to enter the Mafia world.",
          select_mode: "Select Mode",
          single_player: "Single Player",
          soon: "Coming soon...",
          shop_title: "Shop Section",
          rules: "Game Rules",
          //abought
          about_title: "ABOUT PROJECT",
about_mission: "OUR MISSION",
about_mission_desc: "Mafia Creative Game is a platform that combines strategy, psychology, and logical thinking. Our goal is to give players a real detective atmosphere.",
about_rules_title: "BASIC RULES",
rule_1: "Keep your role a secret.",
rule_2: "Make logical conclusions for city peace.",
rule_3: "If you are Mafia, act discreetly.",
about_dev: "DEVELOPER",
system_version: "VERSION: 2.0.26 BETA",

          // Profile Section
          loading: "IDENTIFYING AGENT...",
          credits: "CREDITS",
          rank_xp: "RANK XP",
          dashboard: "DASHBOARD",
          mafia_syndicate: "MAFIA SYNDICATE",
          civilian_defense: "CIVILIAN DEFENSE",
          winrate: "OVERALL WINRATE",
          total_ops: "TOTAL OPERATIONS",
          kills: "CONFIRMED KILLS",
          inf_records: "Infiltration & Neutralization Records",
          surv_records: "Strategy & Survival Records",
          wins: "WINS",
          ops: "Ops",

          // Roles
          don: "THE DON (BOSS)",
          enforcer: "THE ENFORCER",
          citizen: "CITIZEN",
          sheriff: "SHERIFF",
          doctor: "DOCTOR",
          system_online: "SYSTEM ONLINE"
        }
      }
    }
  });

export default i18n;