import { memo } from "react";
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

// memo: у компонента нет пропсов, но родитель (Auth) ре-рендерился на каждое
// нажатие клавиши. Мемоизация полностью убирает лишний реконсил blur-слоёв.
export const AuthBackground = memo(function AuthBackground() {
  return (
    <>
      <ParticleBackground />

      {/* На мобильных не рендерим декоративные blur-слои: даже статичные
          пятна 280×280 с blur[40px] заставляют iOS Safari перекомпоновывать
          композитные слои на каждый setState в форме ввода. */}

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
});
