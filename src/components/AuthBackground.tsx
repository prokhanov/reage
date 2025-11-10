import { ParticleBackground } from "./ParticleBackground";

export function AuthBackground() {
  return (
    <>
      <ParticleBackground />
      
      {/* Асимметричные градиентные пятна с переливанием */}
      {/* Большое пятно слева сверху */}
      <div 
        className="absolute -top-32 -left-32 w-[600px] h-[600px] bg-primary/20 rounded-full blur-[120px] animate-float" 
      />
      
      {/* Среднее пятно справа сверху */}
      <div 
        className="absolute top-10 -right-20 w-[450px] h-[450px] bg-accent/25 rounded-full blur-[100px] animate-float-delayed" 
      />
      
      {/* Огромное центральное пятно */}
      <div 
        className="absolute top-1/3 left-1/4 w-[800px] h-[800px] bg-secondary-glow/15 rounded-full blur-[140px] animate-float-slow" 
      />
      
      {/* Пятно справа внизу */}
      <div 
        className="absolute bottom-[-100px] right-[15%] w-[550px] h-[550px] bg-primary-glow/18 rounded-full blur-[110px] animate-float" 
        style={{ animationDelay: "1.5s", animationDuration: "25s" }} 
      />
      
      {/* Пятно слева внизу */}
      <div 
        className="absolute -bottom-24 left-[5%] w-[500px] h-[500px] bg-accent-glow/20 rounded-full blur-[100px] animate-float-delayed" 
        style={{ animationDelay: "3s", animationDuration: "28s" }} 
      />
      
      {/* Дополнительное маленькое пятно для переливания */}
      <div 
        className="absolute top-[45%] right-[25%] w-[350px] h-[350px] bg-primary/15 rounded-full blur-[90px] animate-float" 
        style={{ animationDelay: "4s", animationDuration: "22s" }} 
      />
      
      {/* Еще одно асимметричное пятно */}
      <div 
        className="absolute bottom-[30%] left-[40%] w-[400px] h-[400px] bg-accent/18 rounded-full blur-[95px] animate-float-slow" 
        style={{ animationDelay: "2.5s", animationDuration: "30s" }} 
      />
    </>
  );
}
