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

      <div
        className="absolute inset-0 pointer-events-none overflow-hidden"
        style={containerStyle}
        aria-hidden
      >
        {/* Большое пятно слева сверху */}
        <div
          className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-primary rounded-full blur-[120px] opacity-[0.12] transform-gpu animate-float"
          style={blobStyle("0s")}
        />

        {/* Среднее пятно справа сверху */}
        <div
          className="absolute top-10 -right-20 w-[450px] h-[450px] bg-accent rounded-full blur-[100px] opacity-[0.12] transform-gpu animate-float-delayed"
          style={blobStyle("1s")}
        />

        {/* Огромное центральное пятно */}
        <div
          className="absolute top-1/3 left-1/4 w-[800px] h-[800px] bg-secondary-glow rounded-full blur-[140px] opacity-[0.10] transform-gpu animate-float-slow"
          style={blobStyle("2s")}
        />

        {/* Пятно справа внизу */}
        <div
          className="absolute bottom-[-100px] right-[15%] w-[550px] h-[550px] bg-primary-glow rounded-full blur-[110px] opacity-[0.12] transform-gpu animate-float-x"
          style={blobStyle("1.5s")}
        />

        {/* Пятно слева внизу */}
        <div
          className="absolute -bottom-24 left-[5%] w-[500px] h-[500px] bg-accent-glow rounded-full blur-[100px] opacity-[0.12] transform-gpu animate-float-delayed"
          style={blobStyle("3s")}
        />

        {/* Дополнительное маленькое пятно для переливания */}
        <div
          className="absolute top-[45%] right-[25%] w-[350px] h-[350px] bg-primary rounded-full blur-[90px] opacity-[0.12] transform-gpu animate-float-y"
          style={blobStyle("4s")}
        />

        {/* Еще одно асимметричное пятно */}
        <div
          className="absolute bottom-[30%] left-[40%] w-[400px] h-[400px] bg-accent rounded-full blur-[95px] opacity-[0.12] transform-gpu animate-float-slow"
          style={blobStyle("2.5s")}
        />
      </div>
    </>
  );
}
