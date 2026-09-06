"""
services/fallback_wishes/templates.py - High-Quality Fallback Greeting Templates
=================================================================================

Curated, production-ready fallback greeting templates used when all configured
AI providers are temporarily unavailable or return unusable output.

Structure:
    TEMPLATES[occasion][language][tone] = [template1, template2, ...]

Each template supports the required {name} placeholder. The fallback service
normalizes occasion and tone values and applies a safe fallback hierarchy.

Supported occasions:
    Birthday, Anniversary, Festival, Holiday, Custom

Supported tones:
    Friendly, Warm, Formal, Funny, Romantic, Inspirational

Supported language codes:
    en, ml, hi, ta, te, kn, es, fr

The service should use the following selection hierarchy:
    1. Exact occasion + language + tone
    2. Occasion + language + Friendly
    3. Occasion + English + requested tone
    4. Occasion + English + Friendly
    5. Generic fallback in requested language
    6. Generic English fallback

IMPORTANT:
    - All templates contain {name}.
    - Templates are intentionally longer than minimal greetings so the fallback
      feels polished and complete.
    - Do not expose to users that these are fallback messages.
"""

from typing import Dict, List


# ============================================================================
# TEMPLATE DATA
# ============================================================================
TEMPLATES: Dict[str, Dict[str, Dict[str, List[str]]]] = {

    # ========================================================================
    # BIRTHDAY
    # ========================================================================
    "Birthday": {
        "en": {
            "Friendly": [
                "Happy Birthday, {name}! 🎉 I hope your special day is filled with laughter, "
                "great memories, delicious cake, and all the people who make you happiest. "
                "May the year ahead bring you exciting opportunities, wonderful surprises, "
                "and countless reasons to smile. Enjoy every moment of your day!",

                "Hey {name}, wishing you the happiest of birthdays! 🎂 May this new chapter "
                "of your life bring you adventures worth remembering, friendships worth "
                "cherishing, and dreams that slowly turn into reality. Celebrate yourself "
                "today and make some beautiful memories!",

                "Happy Birthday, {name}! Another wonderful year has been added to your story, "
                "and I hope the pages ahead are even brighter than the ones before. May your "
                "day be full of joy, your heart be full of happiness, and your year be full "
                "of everything you have been hoping for.",

                "Wishing you a fantastic birthday, {name}! 🎉 Take time today to celebrate "
                "how far you have come and all the amazing possibilities waiting ahead. "
                "May happiness find you often, good people surround you always, and every "
                "new day give you something meaningful to look forward to.",
            ],
            "Warm": [
                "Wishing you a very Happy Birthday, {name}. On this beautiful and special "
                "day, may you feel deeply loved, appreciated, and surrounded by warmth. "
                "May the coming year bring peace to your heart, strength to your journey, "
                "and countless moments that make life feel truly beautiful.",

                "Happy Birthday, dear {name}. Today is a wonderful reminder of the joy you "
                "bring into the lives of those around you. May your day be filled with love "
                "and your year ahead be filled with good health, gentle moments, meaningful "
                "connections, and blessings beyond what you expect.",

                "To the wonderful {name}, heartfelt birthday wishes to you! May this new "
                "year of your life bring you closer to everything that matters most. I hope "
                "you find happiness in the little things, courage in difficult moments, and "
                "love and support wherever life takes you.",
            ],
            "Formal": [
                "Dear {name}, on the occasion of your birthday, please accept my warmest "
                "congratulations and heartfelt wishes. May the year ahead bring you good "
                "health, continued success, personal fulfillment, and many memorable moments "
                "of happiness. Wishing you a prosperous and rewarding year ahead.",

                "Wishing you a very Happy Birthday, {name}. May this new year of your life "
                "bring renewed energy, meaningful achievements, and opportunities that lead "
                "to continued growth and success. Please accept my sincere wishes for health, "
                "happiness, and prosperity.",

                "On your birthday, {name}, I extend my sincerest greetings and best wishes. "
                "May each day of the coming year bring you satisfaction, progress, and "
                "lasting happiness, both personally and professionally.",
            ],
            "Funny": [
                "Happy Birthday, {name}! 😄 They say age is just a number, and thankfully "
                "numbers are not allowed to reveal all our secrets. Eat the cake, enjoy the "
                "celebration, ignore the candles if there are too many, and remember that "
                "you are not getting older — you are becoming a classic!",

                "Congratulations, {name}! 🎂 You have successfully completed another trip "
                "around the sun without causing any major planetary problems. That is an "
                "achievement worth celebrating! May your cake be large, your gifts be useful, "
                "and your age remain a closely guarded secret.",

                "Happy Birthday, {name}! Scientists may not agree on many things, but they "
                "all agree that birthdays are an excellent excuse to eat cake without sharing. "
                "So celebrate confidently, laugh loudly, and enjoy being one year wiser — "
                "or at least one year better at pretending to be wiser! 😄",
            ],
            "Romantic": [
                "Happy Birthday, {name} 💕 Today is especially beautiful because it celebrates "
                "the day someone truly wonderful came into this world. You bring warmth, joy, "
                "and meaning in ways that words cannot fully describe. I hope your day is as "
                "beautiful as the happiness you bring into my life.",

                "On your birthday, {name}, I want you to know how deeply special you are. "
                "Every shared memory, every smile, and every moment together has made life "
                "more beautiful. May this new year bring you everything your heart desires. "
                "Happy Birthday, my love! 💖",

                "Happy Birthday to the amazing {name}. You have a way of making ordinary "
                "moments feel special and difficult days feel lighter. Today I celebrate you, "
                "your beautiful heart, and the happiness of having you in my life. 💕",
            ],
            "Inspirational": [
                "Happy Birthday, {name}! A new year of life is not simply about growing older; "
                "it is another opportunity to grow wiser, dream bigger, and move closer to the "
                "life you truly want. Believe in your journey, trust your strength, and make "
                "this next chapter one you will be proud to remember.",

                "Wishing you a Happy Birthday, {name}. May this year be your boldest and "
                "brightest yet. Take chances when they matter, learn from every experience, "
                "and never underestimate how much you can achieve through patience, courage, "
                "and belief in yourself.",

                "Happy Birthday, {name}! The road ahead is filled with possibilities that "
                "have not yet revealed themselves. Keep moving forward, keep learning, and "
                "keep believing that your best days can still be ahead of you.",
            ],
        },

        "ml": {
            "Friendly": [
                "പ്രിയ {name}, ഹൃദയം നിറഞ്ഞ ജന്മദിനാശംസകൾ! 🎉 നിന്റെ ഈ പ്രത്യേക ദിവസം "
                "ചിരിയും സന്തോഷവും സ്നേഹവും മനോഹരമായ ഓർമ്മകളും നിറഞ്ഞതാകട്ടെ. നിന്റെ "
                "ജീവിതത്തിലെ ഓരോ പുതിയ ദിവസവും നിനക്ക് പ്രതീക്ഷയും സന്തോഷവും നൽകട്ടെ. "
                "നിനക്കായി ഏറ്റവും നല്ലതെല്ലാം സംഭവിക്കട്ടെ!",

                "ജന്മദിനാശംസകൾ, {name}! 🎂 ഇന്നത്തെ ദിവസം നിനക്ക് ഏറെ സന്തോഷം നൽകുന്ന "
                "മനോഹരമായ നിമിഷങ്ങളാൽ നിറഞ്ഞതാകട്ടെ. നല്ല ആളുകളും നല്ല അനുഭവങ്ങളും പുതിയ "
                "അവസരങ്ങളും നിന്റെ ജീവിതയാത്രയിൽ എന്നും കൂടെയുണ്ടാകട്ടെ. സന്തോഷത്തോടെ ഈ ദിവസം ആഘോഷിക്കൂ!",

                "ഹാപ്പി ബർത്ത്ഡേ, {name}! നിന്റെ ജീവിതത്തിലെ മറ്റൊരു മനോഹരമായ വർഷത്തിന്റെ "
                "ആരംഭമാണിത്. കഴിഞ്ഞ അനുഭവങ്ങളിൽ നിന്ന് കൂടുതൽ ശക്തിയോടെ മുന്നോട്ട് പോയി, "
                "പുതിയ സ്വപ്നങ്ങളും സന്തോഷങ്ങളും സ്വന്തമാക്കാൻ കഴിയട്ടെ. ഈ ദിവസം നിനക്കായി "
                "മാത്രമുള്ള സന്തോഷത്തിന്റെ ദിനമാകട്ടെ!",

                "പ്രിയ {name}, നിന്റെ ജന്മദിനത്തിൽ ഹൃദയം നിറഞ്ഞ ആശംസകൾ! 🎉 നിന്റെ ചിരി "
                "എപ്പോഴും നിലനിൽക്കട്ടെ, മനസ്സ് സന്തോഷത്തോടെ നിറയട്ടെ, ജീവിതം മനോഹരമായ "
                "ഓർമ്മകളാൽ സമ്പന്നമാകട്ടെ. വരാനിരിക്കുന്ന ദിവസങ്ങൾ നിനക്ക് കൂടുതൽ നല്ല വാർത്തകളും വിജയങ്ങളും നൽകട്ടെ.",
            ],
            "Warm": [
                "പ്രിയപ്പെട്ട {name}, ഈ ജന്മദിനത്തിൽ നിന്റെ ജീവിതം സ്നേഹവും സന്തോഷവും "
                "സമാധാനവും നിറഞ്ഞതാകണമെന്ന് ഹൃദയം നിറഞ്ഞ് ആശംസിക്കുന്നു. നിന്റെ മനസ്സിൽ "
                "ആഗ്രഹിക്കുന്ന നല്ല കാര്യങ്ങൾ ഒന്നൊന്നായി സഫലമാകട്ടെ. സ്നേഹവും അനുഗ്രഹവും "
                "നിറഞ്ഞ ഒരു മനോഹരമായ വർഷം നിനക്കായി വരട്ടെ. ഹൃദ്യമായ ജന്മദിനാശംസകൾ! 💖",

                "പ്രിയ {name}, ഇന്ന് നിന്റെ ജീവിതത്തിലെ വളരെ പ്രത്യേകമായ ഒരു ദിവസമാണ്. "
                "നിന്നെ സ്നേഹിക്കുന്നവരുടെ സാന്നിധ്യവും മനോഹരമായ ഓർമ്മകളും ഈ ദിവസം കൂടുതൽ "
                "സന്തോഷകരമാക്കട്ടെ. ആരോഗ്യവും സമാധാനവും സന്തോഷവും നിന്റെ ജീവിതത്തിൽ എന്നും "
                "നിലനിൽക്കട്ടെ. ഹൃദയം നിറഞ്ഞ ജന്മദിനാശംസകൾ!",

                "ഈ ജന്മദിനത്തിൽ നിനക്കായി എല്ലാ നല്ല ആശംസകളും നേരുന്നു, {name}. ജീവിതം "
                "എപ്പോഴും നമ്മൾ ആഗ്രഹിച്ചതുപോലെ ലളിതമാകണമെന്നില്ലെങ്കിലും, നിന്റെ മനസ്സിലെ "
                "ധൈര്യവും പ്രതീക്ഷയും നിന്നെ മനോഹരമായ വഴികളിലേക്ക് നയിക്കട്ടെ. സന്തോഷവും "
                "സ്നേഹവും നിറഞ്ഞ ഒരു പുതിയ വർഷം നിനക്കുണ്ടാകട്ടെ.",
            ],
            "Formal": [
                "ബഹുമാനപ്പെട്ട {name}, അങ്ങയുടെ ജന്മദിനത്തിന്റെ ഈ സന്തോഷകരമായ അവസരത്തിൽ "
                "ഹൃദയം നിറഞ്ഞ ആശംസകൾ നേർക്കുന്നു. നല്ല ആരോഗ്യവും ദീർഘായുസ്സും സമാധാനവും "
                "ജീവിതത്തിലെ എല്ലാ മേഖലകളിലും പുരോഗതിയും അങ്ങയ്ക്ക് ലഭിക്കട്ടെ. വരാനിരിക്കുന്ന "
                "വർഷം സന്തോഷവും നേട്ടങ്ങളും നിറഞ്ഞതാകട്ടെ.",

                "പ്രിയ {name}, ജന്മദിനാശംസകൾ സ്വീകരിക്കുക. ജീവിതത്തിലെ പുതിയ വർഷം കൂടുതൽ "
                "സമൃദ്ധിയും സന്തോഷവും വ്യക്തിപരമായും തൊഴിൽപരമായും വിജയങ്ങളും നൽകട്ടെ എന്ന് "
                "ഹൃദയം നിറഞ്ഞ് ആശംസിക്കുന്നു.",
            ],
            "Funny": [
                "ഹാപ്പി ബർത്ത്ഡേ, {name}! 😄 പ്രായം ഒരു സംഖ്യ മാത്രമാണെന്ന് എല്ലാവരും പറയും, "
                "പക്ഷേ കേക്കിലെ മെഴുകുതിരികൾ ചിലപ്പോൾ സത്യം പറഞ്ഞേക്കാം! എന്തായാലും ഇന്ന് "
                "കണക്കുകൂട്ടലുകൾ എല്ലാം മറന്ന് കേക്ക് കഴിച്ച് സന്തോഷത്തോടെ ആഘോഷിക്കൂ. നിനക്ക് "
                "ഇനിയും ഒരുപാട് മനോഹരമായ വർഷങ്ങൾ മുന്നിലുണ്ട്!",

                "ജന്മദിനാശംസകൾ, {name}! 🎂 മറ്റൊരു വർഷം കൂടി വിജയകരമായി പൂർത്തിയാക്കിയതിന് "
                "ആദ്യം ഒരു വലിയ കൈയടി! ഇന്ന് ഡയറ്റ് നാളെയ്ക്ക് മാറ്റിവെക്കാം, കാരണം ജന്മദിനത്തിൽ "
                "കേക്ക് കഴിക്കുന്നത് നിയമപരമായി സന്തോഷത്തിന്റെ ഭാഗമാണെന്ന് നമുക്ക് തന്നെ തീരുമാനിക്കാം! 😄",
            ],
            "Romantic": [
                "പ്രിയപ്പെട്ട {name}, ഹൃദയം നിറഞ്ഞ ജന്മദിനാശംസകൾ! 💕 നിനക്കൊപ്പമുള്ള ഓരോ "
                "നിമിഷവും എന്റെ ജീവിതത്തിലെ മനോഹരമായ ഓർമ്മയാണ്. നിന്റെ ചിരിയും സ്നേഹവും "
                "എന്റെ ദിവസങ്ങളെ കൂടുതൽ മനോഹരമാക്കുന്നു. ഈ പ്രത്യേക ദിവസം നിനക്ക് അളവറ്റ "
                "സന്തോഷവും സ്നേഹവും നൽകട്ടെ.",

                "ജന്മദിനാശംസകൾ, പ്രിയ {name}! 💖 ലോകം നിനക്കായി കൂടുതൽ മനോഹരമായിരിക്കട്ടെ, "
                "കാരണം നീ എന്റെ ജീവിതത്തെ മനോഹരമാക്കുന്നതുപോലെ സന്തോഷവും സ്നേഹവും അർഹിക്കുന്ന "
                "ഒരു അത്ഭുതകരമായ വ്യക്തിയാണ്. നിന്റെ എല്ലാ സ്വപ്നങ്ങളും പൂവണിയട്ടെ.",
            ],
            "Inspirational": [
                "ജന്മദിനാശംസകൾ, {name}! ഓരോ ജന്മദിനവും ജീവിതത്തിലെ ഒരു പുതിയ അധ്യായത്തിന്റെ "
                "തുടക്കമാണ്. കഴിഞ്ഞ അനുഭവങ്ങളിൽ നിന്ന് പഠിച്ച്, കൂടുതൽ ധൈര്യത്തോടെ പുതിയ "
                "സ്വപ്നങ്ങളിലേക്ക് മുന്നോട്ട് പോകൂ. നിന്റെ ഏറ്റവും നല്ല ദിനങ്ങൾ ഇനിയും വരാനുണ്ട്. "
                "സ്വയം വിശ്വസിച്ച് ലക്ഷ്യങ്ങളിലേക്ക് മുന്നേറൂ!",

                "പ്രിയ {name}, ഈ ജന്മദിനം നിന്റെ ജീവിതത്തിലെ പുതിയ സാധ്യതകളുടെ തുടക്കമാകട്ടെ. "
                "ചെറിയ മുന്നേറ്റങ്ങൾ പോലും വലിയ വിജയങ്ങളിലേക്ക് നയിക്കുമെന്ന് ഓർക്കൂ. സ്വപ്നങ്ങളെ "
                "ഭയപ്പെടാതെ പിന്തുടരൂ, പരിശ്രമത്തിൽ വിശ്വസിക്കൂ, നിന്റെ യാത്രയിൽ സന്തോഷം കണ്ടെത്തൂ.",
            ],
        },

        "hi": {
            "Friendly": [
                "जन्मदिन की हार्दिक बधाइयाँ, {name}! 🎉 आपका यह खास दिन खुशियों, "
                "मुस्कुराहटों और खूबसूरत यादों से भरा रहे। आने वाला वर्ष आपके लिए नए "
                "अवसर, अच्छी खबरें और जीवन में आगे बढ़ने के कई सुंदर मौके लेकर आए।",

                "हैप्पी बर्थडे, {name}! 🎂 आज का दिन आपके नाम है, इसलिए खूब मुस्कुराइए, "
                "दिल खोलकर खुशियाँ मनाइए और उन लोगों के साथ समय बिताइए जो आपके जीवन को "
                "खास बनाते हैं। आपकी हर इच्छा धीरे-धीरे सच हो, यही शुभकामना है।",

                "{name}, जन्मदिन मुबारक हो! जीवन का यह नया वर्ष आपके लिए उम्मीद, उत्साह "
                "और सफलता लेकर आए। हर दिन आपको कुछ नया सीखने, कुछ अच्छा पाने और अपने "
                "सपनों के थोड़ा और करीब पहुँचने का अवसर मिले।",
            ],
            "Warm": [
                "प्रिय {name}, आपके जन्मदिन पर दिल की गहराइयों से शुभकामनाएँ। आपका जीवन "
                "प्यार, स्वास्थ्य, शांति और खुशियों से भरा रहे। आने वाला समय आपके लिए "
                "सुकून भरे पल और उन सभी चीज़ों की प्राप्ति लेकर आए जिनकी आप दिल से इच्छा करते हैं।",

                "जन्मदिन की बहुत-बहुत शुभकामनाएँ, {name}! आज के दिन आप यह महसूस करें कि "
                "आप कितने खास हैं और कितने लोगों की खुशियों का हिस्सा हैं। ईश्वर आपको "
                "स्वस्थ, प्रसन्न और सफल रखे तथा हर कठिन रास्ते पर सही दिशा दे।",
            ],
            "Formal": [
                "आदरणीय {name}, आपके जन्मदिन के शुभ अवसर पर मेरी हार्दिक शुभकामनाएँ स्वीकार करें। "
                "आपको उत्तम स्वास्थ्य, सुख, समृद्धि और जीवन के प्रत्येक क्षेत्र में निरंतर सफलता प्राप्त हो। "
                "आने वाला वर्ष आपके लिए उपलब्धियों और संतोष से भरा रहे।",

                "प्रिय {name}, जन्मदिन की हार्दिक बधाई। आपके जीवन में निरंतर प्रगति, सम्मान और "
                "खुशहाली बनी रहे तथा आने वाला वर्ष नए अवसरों और सकारात्मक उपलब्धियों से परिपूर्ण हो।",
            ],
            "Funny": [
                "हैप्पी बर्थडे, {name}! 😄 एक साल और बीत गया और अब आप आधिकारिक रूप से पहले से "
                "थोड़े ज्यादा अनुभवी हो गए हैं। उम्र के बारे में ज्यादा मत सोचिए — आज का सबसे "
                "महत्वपूर्ण काम है केक खाना और मज़े करना! 🎂",

                "{name}, जन्मदिन मुबारक! आपने जीवन का एक और साल सफलतापूर्वक पूरा कर लिया है। "
                "यह बड़ी उपलब्धि है और इसका जश्न केक, हँसी और कुछ अतिरिक्त मिठाइयों के बिना "
                "बिल्कुल अधूरा रहेगा! 😄",
            ],
            "Romantic": [
                "हैप्पी बर्थडे, {name} 💕 आप मेरे जीवन के उन खूबसूरत लोगों में से हैं जिनकी मौजूदगी "
                "साधारण दिनों को भी खास बना देती है। आज मैं आपके लिए ढेर सारी खुशियाँ, प्यार और "
                "आपके हर सपने के पूरे होने की कामना करता हूँ।",

                "प्रिय {name}, आपके जन्मदिन पर बस इतना कहना है कि आपकी मुस्कान मेरे लिए बहुत "
                "कीमती है। आपका हर आने वाला दिन प्यार, सुकून और खूबसूरत पलों से भरा रहे। "
                "जन्मदिन की ढेर सारी शुभकामनाएँ! 💖",
            ],
            "Inspirational": [
                "जन्मदिन मुबारक, {name}! हर नया साल जीवन का एक नया अवसर है — अपने सपनों को "
                "और बड़े देखने, डर से आगे बढ़ने और अपने भीतर की क्षमता को पहचानने का अवसर। "
                "खुद पर विश्वास रखिए और आगे बढ़ते रहिए।",

                "{name}, आपका हर जन्मदिन यह याद दिलाता है कि यात्रा अभी जारी है और आगे बहुत "
                "कुछ संभव है। छोटी शुरुआतों को कभी कम मत समझिए, क्योंकि लगातार प्रयास ही "
                "बड़े सपनों को वास्तविकता में बदलते हैं।",
            ],
        },

        "ta": {
            "Friendly": [
                "இனிய பிறந்த நாள் வாழ்த்துக்கள், {name}! 🎉 உங்கள் இந்த சிறப்பான நாள் மகிழ்ச்சி, "
                "சிரிப்பு மற்றும் அழகான நினைவுகளால் நிறைந்ததாக அமையட்டும். வரவிருக்கும் ஆண்டு "
                "உங்களுக்கு நல்ல வாய்ப்புகளையும் வெற்றிகளையும் கொண்டு வரட்டும்.",

                "பிறந்த நாள் வாழ்த்துக்கள், {name}! 🎂 இன்று உங்களுக்கான நாள். உங்களை நேசிக்கும் "
                "மக்களுடன் மகிழ்ச்சியாகக் கொண்டாடி, உங்கள் வாழ்க்கையின் புதிய ஆண்டை நம்பிக்கையுடன் தொடங்குங்கள்.",
            ],
            "Warm": [
                "அன்பான {name}, உங்கள் பிறந்த நாளில் இதயம் நிறைந்த வாழ்த்துக்கள். உங்கள் வாழ்க்கை "
                "எப்போதும் ஆரோக்கியம், அன்பு, அமைதி மற்றும் மகிழ்ச்சியால் நிரம்பியிருக்கட்டும். "
                "நீங்கள் விரும்பும் நல்லவை அனைத்தும் உங்களைத் தேடி வரட்டும்.",
            ],
        },

        "te": {
            "Friendly": [
                "జన్మదిన శుభాకాంక్షలు, {name}! 🎉 మీ ఈ ప్రత్యేక రోజు ఆనందం, నవ్వులు మరియు "
                "మధురమైన జ్ఞాపకాలతో నిండిపోవాలి. రాబోయే సంవత్సరం మీకు కొత్త అవకాశాలు మరియు విజయాలను అందించాలి.",

                "హ్యాపీ బర్త్‌డే, {name}! 🎂 ఈ రోజు పూర్తిగా మీకోసం. మీకు ఇష్టమైన వారితో కలిసి "
                "సంతోషంగా జరుపుకుని, కొత్త ఆశలతో మరో అందమైన సంవత్సరాన్ని ప్రారంభించండి.",
            ],
            "Warm": [
                "ప్రియమైన {name}, మీ జన్మదినాన హృదయపూర్వక శుభాకాంక్షలు. మీ జీవితంలో ఆరోగ్యం, "
                "ఆనందం, ప్రేమ మరియు శాంతి ఎల్లప్పుడూ ఉండాలని కోరుకుంటున్నాను.",
            ],
        },

        "kn": {
            "Friendly": [
                "ಹ್ಯಾಪಿ ಬರ್ತ್‌ಡೇ, {name}! 🎉 ನಿಮ್ಮ ಈ ವಿಶೇಷ ದಿನ ಸಂತೋಷ, ನಗು ಮತ್ತು ಸುಂದರ ನೆನಪುಗಳಿಂದ "
                "ತುಂಬಿರಲಿ. ಮುಂದಿನ ವರ್ಷ ನಿಮ್ಮ ಜೀವನಕ್ಕೆ ಹೊಸ ಅವಕಾಶಗಳು ಮತ್ತು ಅನೇಕ ಯಶಸ್ಸುಗಳನ್ನು ತರಲಿ.",
            ],
            "Warm": [
                "ಪ್ರಿಯ {name}, ನಿಮ್ಮ ಹುಟ್ಟುಹಬ್ಬದ ಈ ಶುಭ ದಿನದಂದು ಹೃದಯ ತುಂಬಿದ ಶುಭಾಶಯಗಳು. "
                "ಆರೋಗ್ಯ, ಸಂತೋಷ, ಪ್ರೀತಿ ಮತ್ತು ಸಮೃದ್ಧಿ ನಿಮ್ಮ ಜೀವನದಲ್ಲಿ ಸದಾ ಇರಲಿ.",
            ],
        },

        "es": {
            "Friendly": [
                "¡Feliz cumpleaños, {name}! 🎉 Que este día especial esté lleno de alegría, "
                "risas y momentos inolvidables. Que el nuevo año de tu vida te traiga "
                "oportunidades, aventuras y muchas razones para sonreír.",

                "¡Muchas felicidades, {name}! 🎂 Hoy es un buen día para celebrar todo lo que "
                "eres y todo lo que todavía está por venir. Disfruta cada momento rodeado de "
                "las personas que más aprecias.",
            ],
            "Warm": [
                "Querido/a {name}, en tu cumpleaños te deseo paz, amor y mucha felicidad. "
                "Que cada día del nuevo año de tu vida te acerque a tus sueños y te regale "
                "momentos que valga la pena recordar.",
            ],
        },

        "fr": {
            "Friendly": [
                "Joyeux anniversaire, {name}! 🎉 Que cette journée spéciale soit remplie de "
                "joie, de rires et de merveilleux souvenirs. Que cette nouvelle année de ta "
                "vie t'apporte de belles opportunités et beaucoup de bonheur.",

                "Bon anniversaire, {name}! 🎂 Aujourd'hui est l'occasion parfaite de célébrer "
                "tout ce que tu es et tout ce qui t'attend encore. Profite pleinement de cette "
                "belle journée avec les personnes qui te sont chères.",
            ],
            "Warm": [
                "Cher/Chère {name}, en ce jour d'anniversaire, je te souhaite beaucoup de "
                "paix, d'amour et de bonheur. Que les mois à venir soient remplis de belles "
                "surprises et de moments précieux.",
            ],
        },
    },

    # ========================================================================
    # ANNIVERSARY
    # ========================================================================
    "Anniversary": {
        "en": {
            "Friendly": [
                "Happy Anniversary, {name}! 🎊 What a beautiful milestone to celebrate. "
                "May this special day bring back your favourite memories and remind you of "
                "all the wonderful moments that have made the journey meaningful. Wishing "
                "you many more years of happiness and togetherness.",

                "Congratulations on your anniversary, {name}! May this celebration be filled "
                "with love, laughter, gratitude, and beautiful memories. Here's to everything "
                "you have shared so far and to many more wonderful moments still waiting ahead.",
            ],
            "Warm": [
                "Wishing you a very Happy Anniversary, {name}. May the love, trust, and "
                "understanding you share continue to grow stronger with every passing year. "
                "May your journey together always be filled with peace, support, and happiness.",

                "Happy Anniversary, dear {name}. Today is a celebration of love, commitment, "
                "and all the little moments that become precious memories over time. May every "
                "new year together bring even more reasons to smile.",
            ],
            "Formal": [
                "On the occasion of your anniversary, {name}, please accept my warmest "
                "congratulations and sincere wishes for continued happiness, mutual respect, "
                "and enduring togetherness in the years ahead.",
            ],
            "Funny": [
                "Happy Anniversary, {name}! 😄 Another year together means another year of "
                "love, memories, teamwork, and successfully deciding what to eat for dinner. "
                "Wishing you both many more happy years of laughter and togetherness!",
            ],
            "Romantic": [
                "Happy Anniversary, {name} 💕 Every shared year becomes a beautiful part of "
                "your story, and every meaningful memory adds another reason to be grateful. "
                "May your love continue to feel like home, today and always.",

                "To my dear {name}, Happy Anniversary! 💖 Thank you for all the moments, "
                "memories, smiles, and love that make the journey so beautiful. May the years "
                "ahead bring even more happiness to share together.",
            ],
            "Inspirational": [
                "Happy Anniversary, {name}! A lasting relationship is built through patience, "
                "trust, understanding, and the choice to keep growing together. May your story "
                "continue to inspire others and become even more beautiful with time.",
            ],
        },

        "ml": {
            "Friendly": [
                "ഹൃദ്യമായ വിവാഹ വാർഷികാശംസകൾ, {name}! 🎊 ഒരുമിച്ച് പങ്കിട്ട മനോഹരമായ "
                "ഓർമ്മകളും സന്തോഷകരമായ നിമിഷങ്ങളും ഈ ദിവസം വീണ്ടും മനസ്സിലേക്ക് വരട്ടെ. "
                "സ്നേഹവും വിശ്വാസവും സന്തോഷവും നിറഞ്ഞ കൂടുതൽ മനോഹരമായ വർഷങ്ങൾ നിങ്ങളെ കാത്തിരിക്കട്ടെ.",

                "വിവാഹ വാർഷികാശംസകൾ, {name}! ഒരുമിച്ച് നടന്ന ഈ മനോഹരമായ യാത്ര ഇനിയും "
                "സന്തോഷവും സമാധാനവും സ്നേഹവും നിറഞ്ഞതാകട്ടെ. ഓരോ പുതിയ വർഷവും നിങ്ങളെ "
                "കൂടുതൽ അടുത്തും സന്തോഷത്തോടെയും നയിക്കട്ടെ.",
            ],
            "Warm": [
                "പ്രിയ {name}, ഈ വിവാഹ വാർഷിക ദിനത്തിൽ ഹൃദയം നിറഞ്ഞ ആശംസകൾ. നിങ്ങൾ തമ്മിലുള്ള "
                "സ്നേഹവും മനസ്സിലാക്കലും വിശ്വാസവും ഓരോ വർഷവും കൂടുതൽ ദൃഢമാകട്ടെ. ഒരുമിച്ചുള്ള "
                "ജീവിതം മനോഹരമായ ഓർമ്മകളാലും സന്തോഷകരമായ നിമിഷങ്ങളാലും സമ്പന്നമാകട്ടെ.",
            ],
            "Romantic": [
                "പ്രിയപ്പെട്ട {name}, വിവാഹ വാർഷികാശംസകൾ! 💕 ഒരുമിച്ച് പങ്കിട്ട ഓരോ ചെറിയ "
                "നിമിഷവും ജീവിതത്തിലെ വലിയ സന്തോഷങ്ങളായി മാറട്ടെ. സ്നേഹവും വിശ്വാസവും കൈകോർത്തു "
                "ഈ മനോഹരമായ ബന്ധം കൂടുതൽ വർഷങ്ങൾ സന്തോഷത്തോടെ മുന്നോട്ട് പോകട്ടെ.",
            ],
        },

        "hi": {
            "Friendly": [
                "शादी की सालगिरह मुबारक हो, {name}! 🎊 यह खास दिन आपके रिश्ते की खूबसूरत "
                "यादों को फिर से जीवंत करे और आने वाले वर्षों के लिए और भी खुशियाँ लेकर आए। "
                "आपका साथ हमेशा प्यार, विश्वास और मुस्कान से भरा रहे।",
            ],
            "Warm": [
                "सालगिरह की हार्दिक शुभकामनाएँ, {name}। आपका प्रेम, विश्वास और साथ हर "
                "बीते वर्ष के साथ और मजबूत होता जाए। आने वाला समय आप दोनों के लिए शांति, "
                "खुशहाली और ढेर सारी सुंदर यादें लेकर आए।",
            ],
            "Romantic": [
                "प्रिय {name}, इस सालगिरह पर दिल से बहुत-बहुत शुभकामनाएँ। 💕 साथ बिताया "
                "हर पल आपके रिश्ते को और खास बनाता रहे और आपका प्यार हमेशा इसी तरह खिलता रहे।",
            ],
        },
    },

    # ========================================================================
    # FESTIVAL
    # ========================================================================
    "Festival": {
        "en": {
            "Friendly": [
                "Wishing you a joyful and festive celebration, {name}! 🪔 May this special "
                "season bring happiness to your home, warmth to your heart, and beautiful "
                "moments with the people you love. Enjoy the celebrations and create memories "
                "that stay with you long after the festivities are over.",

                "Happy Festive Season, {name}! May the spirit of celebration fill your days "
                "with laughter, gratitude, togetherness, and hope. Wishing you and your loved "
                "ones a season filled with peace, happiness, and wonderful memories.",
            ],
            "Warm": [
                "Wishing you a blessed and joyful festival, {name}. May this special occasion "
                "bring light to difficult days, gratitude for the good things in life, and "
                "beautiful moments shared with the people closest to your heart.",
            ],
            "Formal": [
                "On this auspicious festive occasion, {name}, I extend my heartfelt greetings "
                "and best wishes. May the celebration bring peace, prosperity, happiness, and "
                "well-being to you and your loved ones.",
            ],
            "Funny": [
                "Happy Festival, {name}! 🎉 May your celebrations be bright, your food be "
                "delicious, your photos turn out perfectly, and your diet plans politely wait "
                "until the festivities are over! Have a wonderful celebration! 😄",
            ],
            "Inspirational": [
                "Happy Festival, {name}! May this celebration remind you that every new season "
                "can bring fresh hope, renewed energy, and another opportunity to fill life "
                "with kindness, gratitude, and meaningful beginnings.",
            ],
        },

        "ml": {
            "Friendly": [
                "ഉത്സവാശംസകൾ, {name}! 🪔 ഈ ആഘോഷകാലം നിന്റെ ജീവിതത്തിൽ സന്തോഷവും സമാധാനവും "
                "സ്നേഹവും നിറയ്ക്കട്ടെ. കുടുംബത്തിന്റെയും സുഹൃത്തുക്കളുടെയും സാന്നിധ്യത്തിൽ മനോഹരമായ "
                "ഓർമ്മകൾ സൃഷ്ടിച്ച് ഈ പ്രത്യേക ദിനം സന്തോഷത്തോടെ ആഘോഷിക്കൂ.",

                "ഹൃദയം നിറഞ്ഞ ഉത്സവാശംസകൾ, {name}! ഈ പ്രത്യേക ആഘോഷം നിന്റെ വീട്ടിലും മനസ്സിലും "
                "സന്തോഷത്തിന്റെ വെളിച്ചം നിറയ്ക്കട്ടെ. ആരോഗ്യവും സമൃദ്ധിയും നല്ല നാളുകളിലേക്കുള്ള "
                "പ്രതീക്ഷയും എന്നും കൂടെയുണ്ടാകട്ടെ.",
            ],
            "Warm": [
                "പ്രിയ {name}, ഈ ഉത്സവ ദിനത്തിൽ ഹൃദയം നിറഞ്ഞ ആശംസകൾ. ജീവിതത്തിലെ നല്ല കാര്യങ്ങൾക്ക് "
                "നന്ദി പറയാനും പ്രിയപ്പെട്ടവരോടൊപ്പം സന്തോഷം പങ്കിടാനും ഈ ദിവസം ഒരു മനോഹരമായ അവസരമാകട്ടെ. "
                "സമാധാനവും സന്തോഷവും നിന്റെ ജീവിതത്തിൽ എന്നും നിലനിൽക്കട്ടെ.",
            ],
        },

        "hi": {
            "Friendly": [
                "त्योहार की हार्दिक शुभकामनाएँ, {name}! 🪔 यह पर्व आपके जीवन में खुशियाँ, "
                "उल्लास और नई उम्मीदें लेकर आए। परिवार और प्रियजनों के साथ बिताए गए पल "
                "आपकी यादों को और भी खूबसूरत बनाएं।",
            ],
            "Warm": [
                "पर्व की हार्दिक बधाई, {name}। यह शुभ अवसर आपके घर और जीवन में शांति, "
                "समृद्धि और खुशियाँ लेकर आए। हर दिन में आशा और हर रिश्ते में प्रेम बना रहे।",
            ],
        },

        "ta": {
            "Friendly": [
                "இனிய திருவிழா வாழ்த்துக்கள், {name}! 🪔 இந்த மகிழ்ச்சியான காலம் உங்கள் வீட்டிலும் "
                "மனதிலும் சந்தோஷம், அமைதி மற்றும் அன்பை நிரப்பட்டும். உங்கள் அன்புக்குரியவர்களுடன் "
                "அழகான நினைவுகளை உருவாக்கி மகிழ்ச்சியாகக் கொண்டாடுங்கள்.",
            ],
        },

        "te": {
            "Friendly": [
                "పండుగ శుభాకాంక్షలు, {name}! 🪔 ఈ పండుగ మీ జీవితంలో ఆనందం, శాంతి మరియు "
                "సమృద్ధిని నింపాలి. మీ ప్రియమైన వారితో కలిసి ఈ ప్రత్యేక సందర్భాన్ని ఆనందంగా జరుపుకోండి.",
            ],
        },

        "kn": {
            "Friendly": [
                "ಹಬ್ಬದ ಹಾರ್ದಿಕ ಶುಭಾಶಯಗಳು, {name}! 🪔 ಈ ಹಬ್ಬವು ನಿಮ್ಮ ಜೀವನದಲ್ಲಿ ಸಂತೋಷ, ಶಾಂತಿ "
                "ಮತ್ತು ಸಮೃದ್ಧಿಯನ್ನು ತರಲಿ. ನಿಮ್ಮ ಪ್ರಿಯಜನರೊಂದಿಗೆ ಸುಂದರ ನೆನಪುಗಳನ್ನು ಸೃಷ್ಟಿಸಿ.",
            ],
        },

        "es": {
            "Friendly": [
                "¡Felices fiestas, {name}! 🪔 Que esta celebración llene tu hogar de alegría, "
                "tu corazón de paz y tus días de hermosos momentos junto a las personas que más quieres.",
            ],
        },

        "fr": {
            "Friendly": [
                "Joyeuses fêtes, {name}! 🪔 Que cette célébration apporte de la joie dans ton "
                "foyer, de la paix dans ton cœur et de merveilleux moments avec tes proches.",
            ],
        },
    },

    # ========================================================================
    # HOLIDAY
    # ========================================================================
    "Holiday": {
        "en": {
            "Friendly": [
                "Happy Holidays, {name}! 🎄 Wishing you a wonderful season filled with warmth, "
                "good cheer, peaceful moments, and quality time with the people you love most. "
                "May the days ahead give you plenty of reasons to smile and many beautiful memories.",

                "Season's Greetings, {name}! I hope this holiday season gives you time to rest, "
                "reconnect, celebrate, and enjoy the simple moments that make life meaningful. "
                "Wishing you happiness and warmth throughout the season and beyond.",
            ],
            "Warm": [
                "Warmest holiday wishes to you, {name}. May this season bring peace to your "
                "heart, comfort to your home, and beautiful moments that remind you how much "
                "there is to appreciate. Wishing you love, happiness, and a truly restful holiday.",
            ],
            "Formal": [
                "Please accept my warmest holiday greetings, {name}. I hope this season brings "
                "you peace, happiness, and an opportunity to enjoy meaningful moments with those "
                "who are important to you.",
            ],
            "Funny": [
                "Happy Holidays, {name}! 🎄 May your snacks be plentiful, your naps uninterrupted, "
                "your travel plans cooperative, and your family photos surprisingly successful! "
                "Enjoy every cheerful and wonderfully chaotic moment. 😄",
            ],
            "Inspirational": [
                "Happy Holidays, {name}! Take this season as a chance to pause, appreciate how "
                "far you have come, and step into the days ahead with renewed hope and energy.",
            ],
        },

        "ml": {
            "Friendly": [
                "ഹോളിഡേ ആശംസകൾ, {name}! 🎄 ഈ അവധിക്കാലം നിനക്ക് വിശ്രമവും സന്തോഷവും മനോഹരമായ "
                "ഓർമ്മകളും നൽകട്ടെ. പ്രിയപ്പെട്ടവരോടൊപ്പം സമയം ചെലവഴിച്ച് മനസ്സിനെ സന്തോഷിപ്പിക്കുന്ന "
                "ചെറിയ നിമിഷങ്ങൾ ആസ്വദിക്കൂ. വരാനിരിക്കുന്ന ദിവസങ്ങൾ കൂടുതൽ സന്തോഷകരമാകട്ടെ.",

                "അവധിക്കാലാശംസകൾ, {name}! ഈ ദിവസങ്ങൾ നിന്റെ ജീവിതത്തിൽ സമാധാനവും വിശ്രമവും "
                "സ്നേഹവും നിറയ്ക്കട്ടെ. സന്തോഷവും നല്ല ഓർമ്മകളും എന്നും നിന്നോടൊപ്പം ഉണ്ടാകട്ടെ.",
            ],
            "Warm": [
                "പ്രിയ {name}, ഈ അവധിക്കാലത്ത് ഹൃദയം നിറഞ്ഞ ആശംസകൾ. തിരക്കുകളിൽ നിന്ന് കുറച്ച് "
                "സമയം മാറ്റിവെച്ച് മനസ്സിന് വിശ്രമം നൽകാനും പ്രിയപ്പെട്ടവരോടൊപ്പം സന്തോഷം പങ്കിടാനും "
                "കഴിയട്ടെ. സമാധാനവും സന്തോഷവും എപ്പോഴും നിന്നോടൊപ്പം ഉണ്ടാകട്ടെ.",
            ],
        },

        "hi": {
            "Friendly": [
                "हैप्पी हॉलिडेज़, {name}! 🎄 यह छुट्टियों का मौसम आपके लिए आराम, खुशियाँ और "
                "सुंदर यादें लेकर आए। अपने प्रियजनों के साथ समय बिताइए और जीवन के छोटे-छोटे "
                "खुशनुमा पलों का भरपूर आनंद लीजिए।",
            ],
            "Warm": [
                "छुट्टियों की हार्दिक शुभकामनाएँ, {name}। यह मौसम आपके जीवन में शांति, सुकून "
                "और खुशियाँ लेकर आए। आने वाले दिन नई ऊर्जा और अच्छी यादों से भरे रहें।",
            ],
        },

        "ta": {
            "Friendly": [
                "இனிய விடுமுறை வாழ்த்துக்கள், {name}! 🎄 இந்த விடுமுறை நாட்கள் உங்களுக்கு ஓய்வு, "
                "மகிழ்ச்சி மற்றும் உங்கள் அன்புக்குரியவர்களுடன் அழகான நினைவுகளை வழங்கட்டும்.",
            ],
        },

        "te": {
            "Friendly": [
                "హ్యాపీ హాలిడేస్, {name}! 🎄 ఈ సెలవులు మీకు విశ్రాంతి, ఆనందం మరియు మీ "
                "ప్రియమైన వారితో మధురమైన జ్ఞాపకాలను అందించాలి.",
            ],
        },

        "kn": {
            "Friendly": [
                "ಹ್ಯಾಪಿ ಹಾಲಿಡೇಸ್, {name}! 🎄 ಈ ರಜಾದಿನಗಳು ನಿಮಗೆ ವಿಶ್ರಾಂತಿ, ಸಂತೋಷ ಮತ್ತು "
                "ನಿಮ್ಮ ಪ್ರಿಯಜನರೊಂದಿಗೆ ಸುಂದರ ನೆನಪುಗಳನ್ನು ತರಲಿ.",
            ],
        },

        "es": {
            "Friendly": [
                "¡Felices vacaciones, {name}! 🎄 Que esta temporada te regale descanso, alegría "
                "y hermosos momentos junto a las personas que más quieres.",
            ],
        },

        "fr": {
            "Friendly": [
                "Joyeuses vacances, {name}! 🎄 Que cette période t'apporte du repos, de la joie "
                "et de merveilleux moments avec les personnes qui te sont chères.",
            ],
        },
    },

    # ========================================================================
    # CUSTOM
    # ========================================================================
    "Custom": {
        "en": {
            "Friendly": [
                "Warmest wishes for this special occasion, {name}! 🎉 I hope today brings you "
                "joy, good company, and moments worth remembering. Whatever you are celebrating, "
                "may this occasion add another beautiful memory to your journey.",

                "Here's to you, {name}, on this very special day! May every moment be filled "
                "with happiness, positive energy, and the kind of memories that make you smile "
                "long after the day is over.",
            ],
            "Warm": [
                "Sending you the warmest wishes on this meaningful occasion, {name}. May this "
                "day remind you of how much there is to celebrate and how many beautiful moments "
                "are still waiting ahead. Wishing you happiness, peace, and all the very best.",
            ],
            "Formal": [
                "On this special occasion, {name}, please accept my sincere congratulations and "
                "warmest best wishes. May the occasion bring you happiness, fulfillment, and "
                "many memorable moments.",
            ],
            "Funny": [
                "Congratulations, {name}! 🎉 Whatever the occasion is, it clearly deserves a "
                "celebration, some good food, and at least one photo that everyone will pretend "
                "they did not want to take. Enjoy your special day! 😄",
            ],
            "Romantic": [
                "On this special day, {name}, I hope you feel deeply appreciated and loved. 💕 "
                "May this occasion become another beautiful memory that reminds you how special "
                "you are and how much happiness you deserve.",
            ],
            "Inspirational": [
                "Congratulations, {name}! Every meaningful occasion is also a reminder of how "
                "far you have come and how much possibility still lies ahead. Celebrate today "
                "and move into tomorrow with confidence and hope.",
            ],
        },

        "ml": {
            "Friendly": [
                "ഈ പ്രത്യേക ദിനത്തിൽ ഹൃദയം നിറഞ്ഞ ആശംസകൾ, {name}! 🎉 ഇന്നത്തെ ദിവസം നിനക്ക് "
                "സന്തോഷവും മനോഹരമായ ഓർമ്മകളും നൽകട്ടെ. എന്ത് ആഘോഷമായാലും അത് നിന്റെ ജീവിതത്തിലെ "
                "മറ്റൊരു മനോഹരമായ നിമിഷമായി മാറട്ടെ.",

                "പ്രിയ {name}, ഈ വിശേഷ ദിനം നിനക്ക് ഏറെ സന്തോഷം നൽകട്ടെ. പ്രിയപ്പെട്ടവരുടെ "
                "സാന്നിധ്യവും മനോഹരമായ നിമിഷങ്ങളും ഈ അവസരത്തെ കൂടുതൽ പ്രത്യേകമാക്കട്ടെ. "
                "ഹൃദയം നിറഞ്ഞ ആശംസകൾ!",
            ],
            "Warm": [
                "പ്രിയ {name}, ഈ പ്രത്യേക അവസരത്തിൽ എല്ലാ നല്ല ആശംസകളും നേരുന്നു. ജീവിതത്തിലെ "
                "നല്ല നിമിഷങ്ങൾ ആസ്വദിക്കാനും വരാനിരിക്കുന്ന ദിവസങ്ങളെ പ്രതീക്ഷയോടെ സ്വീകരിക്കാനും "
                "ഈ ദിവസം നിനക്ക് സന്തോഷം നൽകട്ടെ.",
            ],
            "Formal": [
                "പ്രിയ {name}, ഈ പ്രത്യേക അവസരത്തിൽ ഹൃദയം നിറഞ്ഞ ആശംസകൾ നേർക്കുന്നു. ജീവിതത്തിൽ "
                "സന്തോഷവും സമാധാനവും വിജയവും ഉണ്ടാകട്ടെ.",
            ],
        },

        "hi": {
            "Friendly": [
                "इस खास मौके पर आपको ढेर सारी शुभकामनाएँ, {name}! 🎉 यह दिन आपके लिए खुशियों, "
                "अच्छी यादों और अपनों के साथ बिताए गए सुंदर पलों से भरा रहे।",

                "प्रिय {name}, इस विशेष अवसर पर दिल से बधाई। यह दिन आपके जीवन में एक और "
                "खूबसूरत याद जोड़ दे और आने वाला समय आपके लिए खुशियाँ लेकर आए।",
            ],
            "Warm": [
                "इस विशेष अवसर पर हार्दिक शुभकामनाएँ, {name}। जीवन में खुशियाँ, शांति और "
                "अच्छे अवसर हमेशा आपके साथ रहें तथा हर नया दिन आपके लिए उम्मीद लेकर आए।",
            ],
            "Formal": [
                "प्रिय {name}, इस विशेष अवसर पर मेरी हार्दिक शुभकामनाएँ स्वीकार करें। "
                "आपके जीवन में सुख, सफलता और संतोष बना रहे।",
            ],
        },

        "ta": {
            "Friendly": [
                "இந்த சிறப்பான நாளில் இதயம் கனிந்த வாழ்த்துக்கள், {name}! 🎉 இந்த நாள் உங்களுக்கு "
                "மகிழ்ச்சி, நல்ல நினைவுகள் மற்றும் அன்புக்குரியவர்களுடன் அழகான தருணங்களை வழங்கட்டும்.",
            ],
        },

        "te": {
            "Friendly": [
                "ఈ ప్రత్యేక సందర్భంలో హృదయపూర్వక శుభాకాంక్షలు, {name}! 🎉 ఈ రోజు మీకు ఆనందం, "
                "మధురమైన జ్ఞాపకాలు మరియు మీ ప్రియమైన వారితో సంతోషకరమైన క్షణాలను అందించాలి.",
            ],
        },

        "kn": {
            "Friendly": [
                "ಈ ವಿಶೇಷ ಸಂದರ್ಭದಲ್ಲಿ ಹೃದಯಪೂರ್ವಕ ಶುಭಾಶಯಗಳು, {name}! 🎉 ಈ ದಿನವು ನಿಮಗೆ ಸಂತೋಷ, "
                "ಸುಂದರ ನೆನಪುಗಳು ಮತ್ತು ಪ್ರಿಯಜನರೊಂದಿಗೆ ಸಂತಸದ ಕ್ಷಣಗಳನ್ನು ತರಲಿ.",
            ],
        },

        "es": {
            "Friendly": [
                "¡Mis mejores deseos en esta ocasión especial, {name}! 🎉 Que este día esté "
                "lleno de alegría, buenos recuerdos y hermosos momentos con las personas que aprecias.",
            ],
        },

        "fr": {
            "Friendly": [
                "Tous mes vœux pour cette occasion spéciale, {name}! 🎉 Que cette journée soit "
                "remplie de joie, de beaux souvenirs et de merveilleux moments avec tes proches.",
            ],
        },
    },
}


# ============================================================================
# GENERIC FALLBACKS BY LANGUAGE
# ============================================================================
GENERIC_FALLBACK_TEMPLATES_BY_LANGUAGE: Dict[str, List[str]] = {
    "en": [
        "Warmest wishes to you, {name}! May this special day bring you joy, happiness, "
        "peace, and wonderful memories that remain with you for a long time.",

        "Sending you love and best wishes, {name}. May the days ahead be brighter, more "
        "peaceful, and filled with opportunities to smile and create beautiful memories.",

        "Dearest {name}, on this special occasion, may you be surrounded by kindness, "
        "happiness, and everything that makes life feel meaningful and beautiful.",
    ],
    "ml": [
        "ഹൃദയം നിറഞ്ഞ ആശംസകൾ, {name}! നിന്റെ ഈ പ്രത്യേക ദിവസം സന്തോഷവും സമാധാനവും "
        "സ്നേഹവും മനോഹരമായ ഓർമ്മകളും നിറഞ്ഞതാകട്ടെ. വരാനിരിക്കുന്ന ദിവസങ്ങൾ നിനക്ക് ഏറ്റവും നല്ലത് നൽകട്ടെ.",

        "പ്രിയ {name}, എല്ലാ നല്ല ആശംസകളും നിനക്കായി നേരുന്നു. ജീവിതത്തിലെ ഓരോ പുതിയ ദിവസവും "
        "പ്രതീക്ഷയും സന്തോഷവും മനോഹരമായ അനുഭവങ്ങളും നൽകട്ടെ.",
    ],
    "hi": [
        "हार्दिक शुभकामनाएँ, {name}! आपका यह विशेष दिन खुशियों, शांति और सुंदर यादों से भरा रहे। "
        "आने वाले दिन आपके लिए नई उम्मीदें और अच्छे अवसर लेकर आएँ।",

        "प्रिय {name}, आपको ढेर सारी शुभकामनाएँ। जीवन का हर नया दिन आपके लिए खुशी, सफलता और "
        "ऐसे पल लेकर आए जिन्हें आप हमेशा याद रखना चाहें।",
    ],
    "ta": [
        "இதயம் கனிந்த வாழ்த்துக்கள், {name}! உங்கள் இந்த சிறப்பான நாள் மகிழ்ச்சி, அமைதி மற்றும் "
        "அழகான நினைவுகளால் நிரம்பியதாக அமையட்டும்.",
    ],
    "te": [
        "హృదయపూర్వక శుభాకాంక్షలు, {name}! మీ ఈ ప్రత్యేక రోజు ఆనందం, శాంతి మరియు మధురమైన "
        "జ్ఞాపకాలతో నిండిపోవాలి.",
    ],
    "kn": [
        "ಹೃದಯಪೂರ್ವಕ ಶುಭಾಶಯಗಳು, {name}! ನಿಮ್ಮ ಈ ವಿಶೇಷ ದಿನ ಸಂತೋಷ, ಶಾಂತಿ ಮತ್ತು ಸುಂದರ ನೆನಪುಗಳಿಂದ ತುಂಬಿರಲಿ.",
    ],
    "es": [
        "¡Mis mejores deseos, {name}! Que este día especial te traiga alegría, paz y recuerdos "
        "hermosos que permanezcan contigo por mucho tiempo.",
    ],
    "fr": [
        "Tous mes meilleurs vœux, {name}! Que cette journée spéciale t'apporte de la joie, de "
        "la paix et de merveilleux souvenirs qui resteront longtemps avec toi.",
    ],
}


# ============================================================================
# ENGLISH LAST-RESORT FALLBACK
# ============================================================================
GENERIC_FALLBACK_TEMPLATES: List[str] = [
    "Warmest wishes to you, {name}! May this special day bring you joy, happiness, "
    "and wonderful memories that last a lifetime.",

    "Sending you love and best wishes, {name}. May every day ahead be brighter, fuller, "
    "and more beautiful than the last.",

    "Dearest {name}, on this occasion I want you to know how special you are and how much "
    "joy you bring to those around you. Warmest wishes always!",
]


# ============================================================================
# NORMALIZATION ALIASES
# ============================================================================
OCCASION_ALIASES: Dict[str, str] = {
    "birthday": "Birthday",
    "birth day": "Birthday",
    "bday": "Birthday",
    "anniversary": "Anniversary",
    "wedding anniversary": "Anniversary",
    "marriage anniversary": "Anniversary",
    "festival": "Festival",
    "festive": "Festival",
    "onam": "Festival",
    "diwali": "Festival",
    "deepavali": "Festival",
    "eid": "Festival",
    "ramadan": "Festival",
    "christmas": "Holiday",
    "holiday": "Holiday",
    "holidays": "Holiday",
    "new year": "Holiday",
    "newyear": "Holiday",
    "custom": "Custom",
    "other": "Custom",
    "general": "Custom",
    "special": "Custom",
}


TONE_ALIASES: Dict[str, str] = {
    "friendly": "Friendly",
    "casual": "Friendly",
    "fun": "Friendly",
    "warm": "Warm",
    "heartfelt": "Warm",
    "caring": "Warm",
    "formal": "Formal",
    "professional": "Formal",
    "official": "Formal",
    "funny": "Funny",
    "humorous": "Funny",
    "playful": "Funny",
    "romantic": "Romantic",
    "love": "Romantic",
    "sweet": "Romantic",
    "inspirational": "Inspirational",
    "motivational": "Inspirational",
    "uplifting": "Inspirational",
}


# ============================================================================
# VALIDATION CONSTANTS
# ============================================================================
SUPPORTED_OCCASIONS = tuple(TEMPLATES.keys())
SUPPORTED_LANGUAGES = tuple(GENERIC_FALLBACK_TEMPLATES_BY_LANGUAGE.keys())
SUPPORTED_TONES = (
    "Friendly",
    "Warm",
    "Formal",
    "Funny",
    "Romantic",
    "Inspirational",
)

DEFAULT_TONE = "Friendly"
DEFAULT_LANGUAGE = "en"
