import { ParticleBackground } from "./ParticleBackground";

// Контейнер изолирует layout/paint от карточки логина —
// браузер не пересчитывает backdrop-filter карточки на каждом кадре анимации.
const containerStyle: React.CSSProperties = {
  contain: "strict" as any,
  willChange: "transform",
};

const blobStyle = (delay: string): React.CSSProperties => ({
  animationDelay: delay,
  willChange: "transform",
  contain: "paint" as any,
});

export function AuthBackground() {
  return (
    <>
      <ParticleBackground />

      {/* Мобильная версия: 2 статичных пятна с лёгким blur, без анимаций.
          Большие blur-слои + float-анимации убивают мобильный GPU. */}
      <div
        className="md:hidden absolute inset-0 pointer-events-none overflow-hidden"
        aria-hidden
      >
        <div className="absolute -top-24 -left-16 w-[280px] h-[280px] bg-primary/15 rounded-full blur-[40px]" />
        <div className="absolute -bottom-24 -right-16 w-[280px] h-[280px] bg-accent/15 rounded-full blur-[40px]" />
      </div>

      {/* Десктоп/планшет: полная версия с 7 пятнами и плавающими анимациями */}
      <div
        className="hidden md:block absolute inset-0 pointer-events-none overflow-hidden"
        style={containerStyle}
        aria-hidden
      >
        <div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-primary rounded-full blur-[120px] opacity-[0.12] transform-gpu animate-float"
          style={blobStyle("0s")}
        />
        <div
          className="absolute top-10 -right-20 w-[450px] h-[450px] bg-accent rounded-full blur-[100px] opacity-[0.12] transform-gpu animate-float-delayed"
          style={blobStyle("1s")}
        />
        <div
          className="absolute top-1/3 left-1/4 w-[800px] h-[800px] bg-secondary-glow rounded-full blur-[140px] opacity-[0.10] transform-gpu animate-float-slow"
          style={blobStyle("2s")}
        />
        <div
          className="absolute bottom-[-100px] right-[15%] w-[550px] h-[550px] bg-primary-glow rounded-full blur-[110px] opacity-[0.12] transform-gpu animate-float-x"
          style={blobStyle("1.5s")}
        />
        <div
          className="absolute -bottom-24 left-[5%] w-[500px] h-[500px] bg-accent-glow rounded-full blur-[100px] opacity-[0.12] transform-gpu animate-float-delayed"
          style={blobStyle("3s")}
        />
        <div
          className="absolute top-[45%] right-[25%] w-[350px] h-[350px] bg-primary rounded-full blur-[90px] opacity-[0.12] transform-gpu animate-float-y"
          style={blobStyle("4s")}
        />
        <div
          className="absolute bottom-[30%] left-[40%] w-[400px] h-[400px] bg-accent rounded-full blur-[95px] opacity-[0.12] transform-gpu animate-float-slow"
          style={blobStyle("2.5s")}
        />
      </div>
    </>
  );
}
