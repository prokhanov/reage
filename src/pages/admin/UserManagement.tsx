import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Search, Shield, Settings, UserPlus, Copy, Check, Plus, Pause, Trash2, RefreshCw } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function UserManagement() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [selectedUserIsPending, setSelectedUserIsPending] = useState(false);
  const [selectedUserInviteToken, setSelectedUserInviteToken] = useState<string | null>(null);
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
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

      const rolesMap = (allRoles || []).reduce((acc: any, role: any) => {
        acc[role.user_id] = {
          role: role.role,
          custom_role: role.custom_roles,
        };
        return acc;
      }, {});

      const { data: allPermissions } = await supabase
        .from("admin_permissions")
        .select("user_id, module, enabled");

      const permissionsMap = (allPermissions || []).reduce((acc: any, perm: any) => {
        if (!acc[perm.user_id]) {
          acc[perm.user_id] = [];
        }
        if (perm.enabled) {
          acc[perm.user_id].push(perm.module);
        }
        return acc;
      }, {});

      const activeUsers = (profiles || []).map((profile) => {
        const userRoleData = rolesMap[profile.id] || { role: "user", custom_role: null };

        return {
          ...profile,
          role: userRoleData.role,
          custom_role: userRoleData.custom_role,
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

      const pendingUsers = (pendingInvites || []).map((invite: any) => ({
        id: invite.token,
        name: invite.metadata?.name || "—",
        email: invite.invited_email,
        role: invite.role,
        role_display_name: rolesDisplayMap[invite.role] || invite.role,
        custom_role: null,
        permissions: [],
        created_at: invite.created_at,
        status: "pending" as const,
        type: "pending" as const,
        invite_token: invite.token,
      }));

      // 3. Объединить и отфильтровать
      const allUsers = [...activeUsers, ...pendingUsers];
      
      // Фильтруем: показываем весь административный персонал (исключаем только обычных пациентов)
      return allUsers.filter(u => u.role !== "user");
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
    if (!confirm(`Удалить пользователя ${userName}? Это действие нельзя отменить.`)) return;

    try {
      if (type === "pending") {
        // Удалить приглашение
        const { error } = await supabase
          .from("invite_tokens")
          .delete()
          .eq("token", inviteToken);

        if (error) throw error;
      } else {
        // Удалить профиль (каскадно удалятся связанные данные)
        const { error } = await supabase
          .from("profiles")
          .delete()
          .eq("id", userId);

        if (error) throw error;
      }

      toast({
        title: "Пользователь удален",
        description: `${userName} был успешно удален`,
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

  const regenerateInviteTokenMutation = useMutation({
    mutationFn: async (oldToken: string) => {
      // Получить данные старого токена
      const { data: oldInvite, error: fetchError } = await supabase
        .from("invite_tokens")
        .select("*")
        .eq("token", oldToken)
        .single();

      if (fetchError) throw fetchError;
      
      const newToken = crypto.randomUUID();
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("User not authenticated");

      // Создать новую запись с новым токеном
      const { error: insertError } = await supabase
        .from("invite_tokens")
        .insert({
          token: newToken,
          role: oldInvite.role,
          invited_email: oldInvite.invited_email,
          metadata: oldInvite.metadata,
          created_by: user.user.id,
        });

      if (insertError) throw insertError;

      // Удалить старую запись
      const { error: deleteError } = await supabase
        .from("invite_tokens")
        .delete()
        .eq("token", oldToken);

      if (deleteError) throw deleteError;
      
      return { token: newToken, role: oldInvite.role };
    },
    onSuccess: (data) => {
      // Автоматически копировать новую ссылку
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
                                setSelectedUserId(user.id);
                                setSelectedUserIsPending(user.type === "pending");
                                setSelectedUserInviteToken((user as any).invite_token || null);
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
                                      <Tooltip>
                                        <TooltipTrigger asChild>
                                          <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const registerUrl = `/register-staff?invite=${user.invite_token}`;
                                              const fullUrl = `${window.location.origin}${registerUrl}`;
                                              navigator.clipboard.writeText(fullUrl).catch(() => {
                                                toast({
                                                  title: "Ссылка создана",
                                                  description: fullUrl,
                                                  duration: 10000,
                                                });
                                              });
                                              toast({
                                                title: "Ссылка скопирована",
                                                description: "Пригласительная ссылка скопирована в буфер обмена",
                                              });
                                            }}
                                          >
                                            <Copy className="w-4 h-4" />
                                          </Button>
                                        </TooltipTrigger>
                                        <TooltipContent>
                                          <p>Скопировать ссылку</p>
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
    </div>
  );
}
