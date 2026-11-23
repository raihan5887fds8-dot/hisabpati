#!/usr/bin/env python3
"""cap add android চালানোর পর একবার চালান (GitHub Actions নিজেই চালায়)।
কাজ: ম্যানিফেস্টে এলার্মের অনুমতি বসায়, azan.mp3 কে res/raw তে কপি করে, নোটিফিকেশন আইকন বানায়।"""
import os, re, shutil, sys

root = os.path.dirname(os.path.abspath(__file__))
android = os.path.join(root, 'android')
manifest_path = os.path.join(android, 'app/src/main/AndroidManifest.xml')
if not os.path.exists(manifest_path):
    sys.exit('android ফোল্ডার নেই — আগে `npx cap add android` চালান')

m = open(manifest_path, encoding='utf-8').read()
perms = [
 'android.permission.POST_NOTIFICATIONS',
 'android.permission.SCHEDULE_EXACT_ALARM',
 'android.permission.USE_EXACT_ALARM',
 'android.permission.RECEIVE_BOOT_COMPLETED',
 'android.permission.WAKE_LOCK',
 'android.permission.VIBRATE',
 'android.permission.USE_FULL_SCREEN_INTENT',
]
add = ''
for p in perms:
    if p not in m:
        add += '    <uses-permission android:name="%s" />\n' % p
if add:
    m = m.replace('</manifest>', add + '</manifest>')
open(manifest_path, 'w', encoding='utf-8').write(m)

# সাউন্ড
raw = os.path.join(android, 'app/src/main/res/raw')
os.makedirs(raw, exist_ok=True)
src = os.path.join(root, 'sound-here', 'azan.mp3')
if os.path.exists(src):
    shutil.copy(src, os.path.join(raw, 'azan.mp3'))
    print('azan.mp3 বসানো হয়েছে')
else:
    print('সতর্কতা: sound-here/azan.mp3 পাওয়া যায়নি — ফোনের ডিফল্ট শব্দ বাজবে')

# নোটিফিকেশন আইকন (সাদা-স্বচ্ছ ভেক্টর: একটা ঘণ্টা)
drw = os.path.join(android, 'app/src/main/res/drawable')
os.makedirs(drw, exist_ok=True)
open(os.path.join(drw, 'ic_stat_icon.xml'), 'w').write("""<vector xmlns:android="http://schemas.android.com/apk/res/android"
    android:width="24dp" android:height="24dp" android:viewportWidth="24" android:viewportHeight="24">
  <path android:fillColor="#FFFFFFFF"
      android:pathData="M12,22c1.1,0 2,-0.9 2,-2h-4c0,1.1 0.9,2 2,2zM18,16v-5c0,-3.07 -1.63,-5.64 -4.5,-6.32V4c0,-0.83 -0.67,-1.5 -1.5,-1.5s-1.5,0.67 -1.5,1.5v0.68C7.64,5.36 6,7.92 6,11v5l-2,2v1h16v-1l-2,-2z"/>
</vector>
""")

# অ্যাপ আইকন: আপনার আইকনগুলো লঞ্চার আইকন হিসেবে বসানো (আকার অনুযায়ী ছোট করে)
try:
    from PIL import Image
except ImportError:
    os.system(sys.executable + ' -m pip install pillow -q')
    from PIL import Image
res = os.path.join(android, 'app/src/main/res')
src_icon = os.path.join(root, 'www', 'icon-512.png')
src_fore = os.path.join(root, 'www', 'icon-512-maskable.png')
sizes = {'mdpi':48,'hdpi':72,'xhdpi':96,'xxhdpi':144,'xxxhdpi':192}
fsizes = {'mdpi':108,'hdpi':162,'xhdpi':216,'xxhdpi':324,'xxxhdpi':432}
if os.path.exists(src_icon):
    base = Image.open(src_icon).convert('RGBA')
    fore = Image.open(src_fore).convert('RGBA') if os.path.exists(src_fore) else base
    for d,px in sizes.items():
        folder = os.path.join(res, 'mipmap-'+d)
        if not os.path.isdir(folder): continue
        base.resize((px,px), Image.LANCZOS).save(os.path.join(folder,'ic_launcher.png'))
        base.resize((px,px), Image.LANCZOS).save(os.path.join(folder,'ic_launcher_round.png'))
        # অ্যাডাপটিভ আইকনের ফোরগ্রাউন্ড: ম্যাসকেবল ছবি নিরাপদ এলাকার ভেতরে বসিয়ে
        fpx = fsizes[d]
        canvas = Image.new('RGBA',(fpx,fpx),(0,0,0,0))
        inner = int(fpx*0.66)
        canvas.paste(fore.resize((inner,inner), Image.LANCZOS), ((fpx-inner)//2,(fpx-inner)//2))
        canvas.save(os.path.join(folder,'ic_launcher_foreground.png'))
    # অ্যাডাপটিভ আইকনের ব্যাকগ্রাউন্ড রং অ্যাপের গাঢ় সবুজ
    vals = os.path.join(res,'values'); os.makedirs(vals, exist_ok=True)
    open(os.path.join(vals,'ic_launcher_background.xml'),'w').write(
      '<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#0F2E24</color>\n</resources>\n')
    print('অ্যাপ আইকন বসানো হয়েছে')
print('প্রস্তুত')
