import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Shield, Settings, UserPlus, Copy, Check, Plus, Pause, Trash2, RefreshCw, CheckCircle, Eye } from "lucide-react";
import { Dialog, DialogTrigger } from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

import { UserPermissionsDialog } from "@/components/admin/UserPermissionsDialog";
import { RoleManagementCard } from "@/components/admin/RoleManagementCard";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { EditPendingUserDialog } from "@/components/admin/EditPendingUserDialog";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserIsPending, setSelectedUserIsPending] = useState(false);
  const [selectedUserInviteToken, setSelectedUserInviteToken] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editPendingDialogOpen, setEditPendingDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: users, isLoading, refetch } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      // 1. Активные пользователи из profiles
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const { data: allRoles } = await supabase
        .from("user_roles")
        .select("user_id, role, role_id, custom_roles(*)");

      const rolesMap = (allRoles || []).reduce((acc: any, r: any) => {
        const next = {
          role: r.role,
          custom_role: r.custom_roles,
          role_id: r.role_id,
          hasCustomRole: !!r.role_id,
          custom_role_name: r.custom_roles?.name,
        };
        const existing = acc[r.user_id];

        // Приоритизируем привилегированные роли (не 'user' или с кастомной ролью)
        const isPrivileged = r.role !== 'user' || !!r.role_id;
        const existingPrivileged = existing && (existing.role !== 'user' || existing.hasCustomRole);

        if (!existing) {
          acc[r.user_id] = next;
        } else if (!existingPrivileged && isPrivileged) {
          // Заменяем непривилегированную запись на привилегированную
          acc[r.user_id] = next;
        } else if (existing.role === 'user' && r.role !== 'user') {
          // Приоритет non-user ролям над user
          acc[r.user_id] = next;
        }
        return acc;
      }, {});

      // Получаем персональные разрешения
      const { data: allPermissions } = await supabase
        .from("admin_permissions")
        .select("user_id, module, enabled");

      // Получаем разрешения из ролей
      const { data: rolePermissionsData } = await supabase
        .from("user_roles")
        .select("user_id, role_permissions(module, enabled)");

      const permissionsMap = (allPermissions || []).reduce((acc: any, perm: any) => {
        if (!acc[perm.user_id]) {
          acc[perm.user_id] = new Set();
        }
        if (perm.enabled) {
          acc[perm.user_id].add(perm.module);
        }
        return acc;
      }, {});

      // Добавляем разрешения из ролей
      (rolePermissionsData || []).forEach((userRole: any) => {
        if (!permissionsMap[userRole.user_id]) {
          permissionsMap[userRole.user_id] = new Set();
        }
        if (userRole.role_permissions) {
          userRole.role_permissions.forEach((rp: any) => {
            if (rp.enabled) {
              permissionsMap[userRole.user_id].add(rp.module);
            }
          });
        }
      });

      // Преобразуем Set в массивы
      Object.keys(permissionsMap).forEach(userId => {
        permissionsMap[userId] = Array.from(permissionsMap[userId]);
      });

      const activeUsers = (profiles || []).map((profile) => {
        const userRoleData = rolesMap[profile.id] || { role: "user", custom_role: null, hasCustomRole: false };

        return {
          ...profile,
          role: userRoleData.role,
          custom_role: userRoleData.custom_role,
          hasCustomRole: userRoleData.hasCustomRole,
          permissions: permissionsMap[profile.id] || [],
          status: "active" as const,
          type: "active" as const,
        };
      });

      // 2. Pending пользователи из invite_tokens
      const { data: pendingInvites, error: invitesError } = await supabase
        .from("invite_tokens")
        .select("*")
        .is("used_by", null)
        .order("created_at", { ascending: false });

      if (invitesError) throw invitesError;

      // Получить display_name для кастомных ролей pending пользователей
      const pendingRoles = [...new Set((pendingInvites || []).map(i => i.role))];
      const { data: customRolesData } = await supabase
        .from("custom_roles")
        .select("name, display_name")
        .in("name", pendingRoles);

      const rolesDisplayMap = (customRolesData || []).reduce((acc: any, r: any) => {
        acc[r.name] = r.display_name;
        return acc;
      }, {});

      const pendingUsers = (pendingInvites || []).map((invite: any) => {
        const metadata = invite.metadata || {};
        const displayName = metadata.firstName && metadata.lastName 
          ? `${metadata.lastName} ${metadata.firstName}`.trim()
          : metadata.name || "—";
        
        return {
          id: invite.token,
          name: displayName,
          email: invite.invited_email,
          role: invite.role,
          role_display_name: rolesDisplayMap[invite.role] || invite.role,
          custom_role: null,
          permissions: [],
          created_at: invite.created_at,
          status: "pending" as const,
          type: "pending" as const,
          invite_token: invite.token,
        };
      });

      // 3. Объединить и отфильтровать
      const allUsers = [...activeUsers, ...pendingUsers];
      
      // Фильтруем: показываем весь административный персонал
      // Исключаем только тех, у кого базовая роль "user" И НЕТ кастомной роли
      return allUsers.filter(u => {
        if (u.role !== "user") return true; // superadmin, admin, doctor
        if ((u as any).hasCustomRole) return true; // связанная кастомная роль через role_id
        if ((u as any).custom_role && (u as any).custom_role.name !== "user") return true; // кастомные роли (manager и т.д.)
        return false; // обычные пациенты
      });
    },
  });

  const filteredUsers = users?.filter((u) => {
    const matchesSearch = u.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === "all" || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleSuspendUser = async (userId: string, userName: string) => {
    if (!confirm(`Приостановить доступ для ${userName}?`)) return;

    try {
      // Удаляем все роли пользователя (кроме user)
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .neq("role", "user");

      if (error) throw error;

      toast({
        title: "Доступ приостановлен",
        description: `Пользователь ${userName} больше не имеет административных прав`,
      });

      refetch();
    } catch (error: any) {
      toast({
        title: "Ошибка",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteUser = async (userId: string, userName: string, type: "active" | "pending", inviteToken?: string) => {
    try {
      if (type === "pending") {
        // Удалить приглашение
        const { error } = await supabase
          .from("invite_tokens")
          .delete()
          .eq("token", inviteToken);

        if (error) throw error;
      } else {
        // Для активного пользователя вызываем Edge Function для полного удаления
        const { data, error } = await supabase.functions.invoke('delete-user', {
          body: { userId }
        });

        if (error) throw error;
        if (data?.error) throw new Error(data.error);

        console.log('User deleted successfully:', data);
      }

      toast({
        title: "Пользователь удален",
        description: `${userName} был успешно удален из системы`,
      });

      refetch();
    } catch (error: any) {
      console.error('Delete user error:', error);
      toast({
        title: "Ошибка удаления",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const regenerateInviteTokenMutation = useMutation({
    mutationFn: async (oldToken: string) => {
      const newToken = crypto.randomUUID();
      
      const { data: updated, error } = await supabase
        .from("invite_tokens")
        .update({ 
          token: newToken, 
          created_at: new Date().toISOString() 
        })
        .eq("token", oldToken)
        .select("token, role")
        .single();

      if (error) throw error;
      return updated;
    },
    onSuccess: (data) => {
      const registerUrl = `/register-staff?invite=${data.token}`;
      const fullUrl = `${window.location.origin}${registerUrl}`;
      navigator.clipboard.writeText(fullUrl);
      
      toast({
        title: "Ссылка перегенерирована",
        description: "Новая пригласительная ссылка скопирована в буфер обмена",
      });
      
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Ошибка",
        description: "Не удалось перегенерировать ссылку: " + error.message,
        variant: "destructive",
      });
    },
  });

  const handleCopyInviteLink = async (token: string) => {
    // Проверяем, существует ли токен
    const { data, error } = await supabase
      .from("invite_tokens")
      .select("token")
      .eq("token", token)
      .maybeSingle();

    if (!data) {
      // Токен не найден - автоматически регенерируем
      toast({
        title: "Обновление ссылки",
        description: "Приглашение не найдено, создаю новую ссылку...",
      });
      regenerateInviteTokenMutation.mutate(token);
      return;
    }

    // Токен валиден - копируем
    const registerUrl = `/register-staff?invite=${data.token}`;
    const fullUrl = `${window.location.origin}${registerUrl}`;
    
    try {
      await navigator.clipboard.writeText(fullUrl);
      toast({
        title: "Ссылка скопирована",
        description: "Пригласительная ссылка скопирована в буфер обмена",
      });
    } catch (clipboardError) {
      console.error("Clipboard write failed:", clipboardError);
      toast({
        title: "Ссылка для приглашения",
        description: fullUrl,
        duration: 15000,
        action: (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                navigator.clipboard.writeText(fullUrl).then(() => {
                  toast({ title: "Скопировано!", duration: 2000 });
                });
              }}
            >
              Скопировать ещё раз
            </Button>
            <Button
              size="sm"
              onClick={() => window.open(fullUrl, "_blank")}
            >
              Открыть ссылку
            </Button>
          </div>
        ),
      });
    }
  };

  const handleCheckInviteToken = async (token: string) => {
    const { data, error } = await supabase
      .from("invite_tokens")
      .select("*")
      .eq("token", token)
      .maybeSingle();

    if (!data) {
      toast({
        title: "Приглашение не найдено",
        description: "Хотите перегенерировать ссылку?",
        action: (
          <Button
            size="sm"
            onClick={() => regenerateInviteTokenMutation.mutate(token)}
          >
            Перегенерировать
          </Button>
        ),
        variant: "destructive",
      });
      return;
    }

    if (data.used_by) {
      toast({
        title: "Приглашение использовано",
        description: "Эта ссылка уже была использована",
        variant: "destructive",
      });
      return;
    }

    if (data.expires_at && new Date(data.expires_at) < new Date()) {
      toast({
        title: "Приглашение истекло",
        description: "Хотите перегенерировать ссылку?",
        action: (
          <Button
            size="sm"
            onClick={() => regenerateInviteTokenMutation.mutate(token)}
          >
            Перегенерировать
          </Button>
        ),
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "✓ Ссылка валидна",
      description: "Приглашение активно и готово к использованию",
    });
  };

  const getInitials = (name: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getRoleBadge = (role: string, roleDisplayName?: string) => {
    const roleConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
      superadmin: { label: "Суперадмин", variant: "destructive" },
      admin: { label: "Админ", variant: "default" },
      doctor: { label: "Врач", variant: "default" },
      user: { label: "Пациент", variant: "secondary" },
    };
    
    // Если есть display_name для кастомной роли - используем его
    if (roleDisplayName && !roleConfig[role]) {
      return (
        <Badge variant="default" className="text-xs">
          {roleDisplayName}
        </Badge>
      );
    }
    
    const config = roleConfig[role] || roleConfig.user;
    return (
      <Badge variant={config.variant} className="text-xs">
        {config.label}
      </Badge>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Управление пользователями</h1>
        <p className="text-muted-foreground mt-1">
          Управление ролями и доступами пользователей
        </p>
      </div>

      <Tabs defaultValue="users" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="users">Пользователи</TabsTrigger>
          <TabsTrigger value="roles">Роли</TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-4 mt-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Все пользователи ({filteredUsers?.length || 0})</CardTitle>
                  <CardDescription>
                    Нажмите на пользователя, чтобы настроить его права доступа
                  </CardDescription>
                </div>
                <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Добавить пользователя
                    </Button>
                  </DialogTrigger>
                  <CreateUserDialog 
                    open={createDialogOpen} 
                    onOpenChange={setCreateDialogOpen}
                  />
                </Dialog>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Поиск по имени..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Фильтр по роли" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все роли</SelectItem>
                    <SelectItem value="superadmin">Суперадмин</SelectItem>
                    <SelectItem value="admin">Админ</SelectItem>
                    <SelectItem value="doctor">Врач</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">Загрузка...</div>
              ) : (
                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Пользователь</TableHead>
                        <TableHead>Роль</TableHead>
                        <TableHead>Статус</TableHead>
                        <TableHead>Доступы к модулям</TableHead>
                        <TableHead>Дата создания</TableHead>
                        <TableHead className="w-[120px]">Действия</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers && filteredUsers.length > 0 ? (
                        filteredUsers.map((user) => (
                          <TableRow
                            key={user.id}
                            className={user.role === "superadmin" ? "cursor-default" : "cursor-pointer hover:bg-muted/50"}
                            onClick={() => {
                              if (user.role !== "superadmin") {
                                if (user.type === "pending") {
                                  setSelectedUserInviteToken((user as any).invite_token || null);
                                  setEditPendingDialogOpen(true);
                                } else {
                                  setSelectedUserId(user.id);
                                  setSelectedUserIsPending(false);
                                  setSelectedUserInviteToken(null);
                                }
                              }
                            }}
                          >
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10">
                                  <AvatarFallback className="bg-primary/10 text-primary">
                                    {getInitials(user.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{user.name || "Без имени"}</p>
                                  <p className="text-xs text-muted-foreground">
                                    ID: {user.id.slice(0, 8)}...
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.custom_role ? (
                                <Badge variant={user.role === "superadmin" ? "destructive" : "default"}>
                                  {user.custom_role.display_name}
                                </Badge>
                              ) : (
                                getRoleBadge(user.role, (user as any).role_display_name)
                              )}
                            </TableCell>
                            <TableCell>
                              {user.status === "active" ? (
                                <Badge variant="default" className="bg-green-600">
                                  Активен
                                </Badge>
                              ) : (
                                <Badge variant="secondary">
                                  Ссылка отправлена
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {user.role === "superadmin" ? (
                                <Badge variant="outline" className="text-xs">
                                  Полный доступ
                                </Badge>
                              ) : user.permissions.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {user.permissions.map((perm: string) => (
                                    <Badge key={perm} variant="secondary" className="text-xs">
                                      {perm}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground text-sm">Нет доступа</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {new Date(user.created_at).toLocaleDateString("ru-RU")}
                            </TableCell>
                            <TableCell>
                              <TooltipProvider>
                                <div className="flex gap-1">
                                  {user.type === "pending" ? (
                                    <>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => e.stopPropagation()}
                                          >
                                            <Eye className="w-4 h-4" />
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-80" onClick={(e) => e.stopPropagation()}>
                                          <div className="space-y-3">
                                            <h4 className="font-medium text-sm">Пригласительная ссылка</h4>
                                            <p className="text-xs text-muted-foreground break-all">
                                              {`${window.location.origin}/register-staff?invite=${user.invite_token}`}
                                            </p>
                                            <div className="flex gap-2">
                                              <Button
                                                size="sm"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleCopyInviteLink(user.invite_token);
                                                }}
                                                className="flex-1"
                                              >
                                                <Copy className="h-3 w-3 mr-1" />
                                                Копировать
                                              </Button>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  window.open(`/register-staff?invite=${user.invite_token}`, "_blank");
                                                }}
                                                className="flex-1"
                                              >
                                                Открыть
                                              </Button>
                                            </div>
                                          </div>
                                        </PopoverContent>
                                      </Popover>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCopyInviteLink(user.invite_token);
                                            }}
                                          >
                                            <Copy className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <div className="space-y-1">
                                            <p>Скопировать ссылку</p>
                                            <p className="text-xs text-muted-foreground max-w-xs break-all">
                                              {`${window.location.origin}/register-staff?invite=${user.invite_token}`}
                                            </p>
                                          </div>
                                        </TooltipContent>
                                      </Tooltip>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleCheckInviteToken(user.invite_token);
                                            }}
                                          >
                                            <CheckCircle className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Проверить ссылку</p>
                                        </TooltipContent>
                                      </Tooltip>

                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              regenerateInviteTokenMutation.mutate(user.invite_token);
                                            }}
                                            disabled={regenerateInviteTokenMutation.isPending}
                                          >
                                            <RefreshCw className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Перегенерировать ссылку</p>
                                        </TooltipContent>
                                      </Tooltip>
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteUser(user.id, user.name, "pending", user.invite_token);
                                            }}
                                          >
                                            <Trash2 className="w-4 h-4 text-destructive" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Удалить приглашение</p>
                                        </TooltipContent>
                                      </Tooltip>
                                    </>
                                  ) : (
                                    <>
                                      {user.role !== "superadmin" && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedUserId(user.id);
                                              }}
                                            >
                                              <Settings className="w-4 h-4" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Настроить права</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                      {user.role !== "user" && user.role !== "superadmin" && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleSuspendUser(user.id, user.name);
                                              }}
                                            >
                                              <Pause className="w-4 h-4 text-orange-500" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Приостановить доступ</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                      {user.role !== "superadmin" && (
                                        <Tooltip>
                                          <TooltipTrigger asChild>
                                            <Button
                                              variant="ghost"
                                              size="icon"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteUser(user.id, user.name, "active");
                                              }}
                                            >
                                              <Trash2 className="w-4 h-4 text-destructive" />
                                            </Button>
                                          </TooltipTrigger>
                                          <TooltipContent>
                                            <p>Удалить пользователя</p>
                                          </TooltipContent>
                                        </Tooltip>
                                      )}
                                    </>
                                  )}
                                </div>
                              </TooltipProvider>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Пользователи не найдены
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="mt-6">
          <RoleManagementCard />
        </TabsContent>
      </Tabs>

      <UserPermissionsDialog
        userId={selectedUserId}
        isPending={selectedUserIsPending}
        inviteToken={selectedUserInviteToken || undefined}
        onClose={() => {
          setSelectedUserId(null);
          setSelectedUserIsPending(false);
          setSelectedUserInviteToken(null);
        }}
        onUpdate={() => refetch()}
      />

      <EditPendingUserDialog
        inviteToken={selectedUserInviteToken}
        open={editPendingDialogOpen}
        onOpenChange={(open) => {
          setEditPendingDialogOpen(open);
          if (!open) {
            setSelectedUserInviteToken(null);
          }
        }}
      />
    </div>
  );
}
