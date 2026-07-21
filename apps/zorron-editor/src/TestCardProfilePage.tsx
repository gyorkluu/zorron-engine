import { useEffect, useRef, useState } from 'react';
import {
  Clock3,
  Crosshair,
  Flower2,
  HeartHandshake,
  MapPin,
  Shield,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { testCardVariables } from './testCardVariables';

const TEST_PORTRAIT_URL = 'http://localhost:4002/uploads/jx3-cards/384528.png';

const profile = {
  name: '青春染指流年',
  mbti: String(testCardVariables.mbti ?? 'ENFP'),
  gender: String(testCardVariables.gender ?? '男'),
  zodiac: String(testCardVariables.zodiac ?? '狮子座'),
  server: String(testCardVariables.server ?? '梦江南'),
  bodyType: String(testCardVariables.body_type ?? '成男'),
  rank: '十五段',
};

const compatibility = [
  { label: '输出', value: 5, icon: Crosshair },
  { label: '生存', value: 4, icon: Shield },
  { label: '社交', value: 6, icon: UserRound },
  { label: '指挥', value: 2, icon: Sparkles },
  { label: '耐心', value: 6, icon: HeartHandshake },
];

function TestCardProfilePage() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const updateScale = () => {
      const parentWidth = canvasRef.current?.parentElement?.clientWidth ?? 960;
      setScale(Math.min(1, Math.max(0.2, (parentWidth - 32) / 960)));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  return (
    <main className="flex min-h-screen w-full items-center justify-center overflow-hidden bg-[#090914]">
      <div className="flex w-full items-center justify-center overflow-hidden" style={{ height: `${540 * scale}px` }}>
        <div
          ref={canvasRef}
          className="relative h-[540px] w-[960px] shrink-0 overflow-hidden bg-[#f6f3f5] text-[#17152a] shadow-[0_24px_70px_rgba(0,0,0,0.45)]"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'center',
            fontFamily: '"Noto Serif SC", "Source Han Serif SC", "Songti SC", serif',
          }}
        >
          <style>{`
            @font-face {
              font-family: 'ProfileSong';
              src: url('/font/XiangcuiDengcusong.ttf') format('truetype');
              font-display: swap;
            }
          `}</style>

          <div className="absolute inset-x-0 top-0 z-20 flex h-[42px] items-center bg-[#121326] px-5 text-[#d5bd7d]">
            <Flower2 size={27} strokeWidth={1.4} />
            <div className="ml-3 border-r border-[#d5bd7d]/40 pr-4 leading-tight">
              <div className="text-[12px] tracking-[2px]">剑网3魔盒</div>
              <div className="text-[7px] tracking-[1.5px]">JX3 MAGIC BOX</div>
            </div>
            <div className="ml-4 text-[12px] tracking-[4px]">个人社交卡</div>
            <div className="mx-auto flex w-[500px] items-center gap-3 text-[9px] tracking-[4px] text-[#d5bd7d]/75">
              <span className="h-px flex-1 bg-[#d5bd7d]/35" />
              <span>唯我独尊，不坠青云之志。</span>
              <span className="h-px flex-1 bg-[#d5bd7d]/35" />
            </div>
            <div className="text-[16px] font-bold tracking-[2px] text-white/90">剑网3</div>
            <div className="ml-2 rounded-sm border border-[#d5bd7d]/50 px-1.5 py-0.5 text-[8px]">魔盒</div>
          </div>

          <div className="absolute inset-x-0 bottom-0 top-[42px] opacity-50" style={{ backgroundImage: 'radial-gradient(#c9c1ce 0.55px, transparent 0.55px)', backgroundSize: '7px 7px' }} />
          <img src={TEST_PORTRAIT_URL} alt="" className="absolute right-[30px] top-[54px] h-[270px] w-[390px] object-cover opacity-[0.055] grayscale" style={{ objectPosition: 'center 20%' }} />

          <section className="absolute left-[28px] top-[66px] z-10 h-[407px] w-[342px] border border-[#a58a4b] bg-[#1d1949] p-[5px] shadow-[0_8px_24px_rgba(31,23,73,0.22)]">
            <div className="absolute inset-[5px] z-10 border border-[#e2cd8f]/55 pointer-events-none" />
            <img src={TEST_PORTRAIT_URL} alt="测试角色" className="h-full w-full object-cover" style={{ objectPosition: 'center top' }} />
            <div className="absolute inset-x-[6px] bottom-[6px] z-10 h-[82px] border-t border-[#d5bd7d]/65 bg-[#171739]/90 px-5 py-3 text-[#f0e2bd] backdrop-blur-[2px]">
              <div className="flex items-center text-[24px] leading-none tracking-[2px]" style={{ fontFamily: 'ProfileSong, serif' }}>
                以火为刃，向光而行<span className="ml-2 text-[15px]">✦</span>
              </div>
              <div className="mt-2 border-t border-[#d5bd7d]/35 pt-2 text-[11px] tracking-[2px]">路遥知马力，日久见人心。</div>
            </div>
            <div className="absolute -left-[15px] top-[22px] z-20 flex h-[56px] w-[56px] items-center justify-center rounded-full border-2 border-[#d5bd7d] bg-[#4f3487] shadow-[0_0_0_5px_#292054]">
              <Sparkles size={28} color="#f0e2bd" strokeWidth={1.5} />
            </div>
            <div className="absolute left-[5px] top-[82px] z-20 flex w-[38px] flex-col items-center border border-[#d5bd7d]/70 bg-[#241d54]/90 py-3 text-[#f0e2bd]">
              <span className="text-[16px] leading-[1.25]">明<br />教</span>
              <span className="my-2 text-[8px]">✦</span>
              <span className="text-[10px] tracking-[2px] [writing-mode:vertical-rl]">夜行燃灯</span>
            </div>
          </section>

          <div className="absolute left-[34px] bottom-[14px] flex items-center text-[7px] tracking-[1.5px] text-[#6d6874]">
            CARD ID · MOHE-2026-0717-MJ <Flower2 className="mx-3 text-[#a58a4b]" size={16} /> JX3 MAGIC BOX PROFILE CARD
          </div>

          <section className="absolute left-[405px] right-[40px] top-[74px] z-10">
            <div className="text-[44px] font-black leading-none tracking-[3px]" style={{ fontFamily: 'ProfileSong, "Noto Serif SC", serif' }}>{profile.name}</div>
            <div className="mt-5 flex items-center gap-3 text-[11px] tracking-[1px] text-[#655674]">
              <span className="h-[5px] w-[5px] rotate-45 bg-[#a88a48]" />
              <span className="text-[9px] tracking-[2px] text-[#8b7e91]">JX3 SOCIAL PROFILE</span>
              <span className="h-px w-[70px] bg-[#8b7e91]/30" />
              <span className="text-[13px] text-[#443454]">寻找长期稳定的晚间搭子</span>
            </div>
          </section>

          <div className="absolute left-[388px] right-[25px] top-[176px] h-px bg-[#71657d]/25" />

          <section className="absolute left-[405px] top-[191px] z-10 h-[141px] w-[525px] bg-white/28">
            <div className="grid h-full grid-cols-[250px_1fr]">
              <div className="border-r border-[#71657d]/20 px-4 py-3">
                <SectionTitle title="个人信息" subtitle="INFORMATION" />
                <div className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3">
                  <InfoItem icon={UserRound} label="MBTI" value={profile.mbti} />
                  <InfoItem icon={UserRound} label="体型" value={profile.bodyType} />
                  <InfoItem icon={Sparkles} label="星座" value={profile.zodiac} />
                  <InfoItem icon={Shield} label="最高段位" value={profile.rank} />
                  <InfoItem icon={MapPin} label="服务器" value={profile.server} />
                  <InfoItem icon={Clock3} label="常用在线" value="20:00-24:00" />
                </div>
              </div>
              <div className="px-5 py-3">
                <SectionTitle title="游戏观" subtitle="GAME PHILOSOPHY" />
                <div className="relative mt-4 border-t border-[#8c7d9b]/20 px-7 pt-6 text-center text-[13px] leading-[1.8] tracking-[1px]">
                  <span className="absolute left-1 top-1 text-[30px] leading-none text-[#8d67bd]/70">“</span>
                  认真投入，也尊重彼此节奏；<br />胜负复盘，失误不苛责。
                  <span className="absolute bottom-[-13px] right-2 text-[30px] leading-none text-[#8d67bd]/70">”</span>
                </div>
              </div>
            </div>
          </section>

          <div className="absolute left-[388px] right-[25px] top-[348px] h-px bg-[#71657d]/25" />

          <section className="absolute left-[405px] right-[70px] top-[365px] z-10 grid grid-cols-[180px_170px_1fr]">
            <div className="border-r border-[#71657d]/20 pr-5">
              <SectionTitle title="常用心法" subtitle="MAIN MINDSET" />
              <Mindset icon="/workspace/xf/10242.png" name="焚影圣诀" rate="82%" />
              <Mindset icon="/workspace/xf/10243.png" name="明尊琉璃体" rate="67%" />
            </div>
            <div className="border-r border-[#71657d]/20 px-5">
              <SectionTitle title="相处偏好" subtitle="MATCH PREFERENCES" />
              <div className="mt-5 grid grid-cols-2 gap-2 text-center text-[9px] text-[#604c87]">
                {['及时沟通', '稳定上线', '愿意复盘', '不压力怪', '互相补位', '长期固定'].map((tag) => (
                  <span key={tag} className="rounded bg-[#eee8f3] px-1 py-1.5">{tag}</span>
                ))}
              </div>
            </div>
            <div className="pl-5">
              <SectionTitle title="匹配指数" subtitle="COMPATIBILITY" />
              <div className="mt-4 space-y-3">
                {compatibility.map(({ label, value, icon: Icon }) => (
                  <div key={label} className="grid grid-cols-[12px_27px_1fr] items-center gap-1 text-[9px]">
                    <Icon size={11} />
                    <span>{label}</span>
                    <div className="flex gap-[3px]">
                      {Array.from({ length: 7 }, (_, index) => (
                        <span key={index} className="h-[6px] w-[9px] rounded-full" style={{ backgroundColor: index < value ? '#8d5cc1' : '#e4e0e7' }} />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <div className="absolute bottom-[10px] left-[388px] right-[28px] h-px bg-[#71657d]/20" />
          <div className="absolute bottom-[26px] right-[20px] flex h-[125px] w-[42px] items-center justify-center rounded-b-[16px] border border-[#8a79a0]/40 bg-[#ded5eb]/75 text-[13px] tracking-[4px] text-[#4e3b72] shadow-sm [writing-mode:vertical-rl]">
            申请搭子
          </div>
        </div>
      </div>
    </main>
  );
}

function SectionTitle({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <h2 className="shrink-0 whitespace-nowrap text-[15px] font-bold tracking-[1px]">{title}</h2>
      <span className="whitespace-nowrap text-[6px] tracking-[0.7px] text-[#6f6877]">{subtitle}</span>
    </div>
  );
}

function InfoItem({ icon: Icon, label, value }: { icon: typeof UserRound; label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-center gap-2">
      <span className="flex h-[23px] w-[23px] shrink-0 items-center justify-center rounded-full bg-[#ece6f1] text-[#62448e]">
        <Icon size={13} strokeWidth={2} />
      </span>
      <div className="min-w-0 leading-tight">
        <div className="text-[7px] tracking-[1px] text-[#77717b]">{label}</div>
        <div className="mt-1 whitespace-nowrap text-[10px] font-bold">{value}</div>
      </div>
    </div>
  );
}

function Mindset({ icon, name, rate }: { icon: string; name: string; rate: string }) {
  return (
    <div className="mt-4 flex items-center gap-3">
      <div className="flex h-[43px] w-[43px] shrink-0 items-center justify-center rounded-full border border-[#8e78aa]/50 bg-white shadow-sm">
        <img src={icon} alt={name} className="h-[36px] w-[36px] rounded-full" />
      </div>
      <div>
        <div className="text-[12px] font-bold tracking-[1px]">{name}</div>
        <div className="mt-1 text-[11px] tracking-[2px] text-[#8d5cc1]">★★★★☆</div>
        <div className="mt-0.5 text-[8px]">使用率 {rate}</div>
      </div>
    </div>
  );
}

export default TestCardProfilePage;
