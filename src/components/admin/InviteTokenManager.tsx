import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Check, Trash2, UserPlus, Calendar, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface InviteTokenManagerProps {
  onInviteCreated?: () => void;
}

export function InviteTokenManager({ onInviteCreated }: InviteTokenManagerProps) {
  const [selectedRole, setSelectedRole] = useState<string>("doctor");
  const [invitedEmail, setInvitedEmail] = useState("");
  const [copiedToken, setCopiedToken] = useState<string | null>(null);
  const [deleteTokenId, setDeleteTokenId] = useState<string | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: customRoles } = useQuery({
    queryKey: ["custom-roles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("custom_roles")
        .select("*")
        .order("is_system", { ascending: false })
        .order("display_name");

      if (error) throw error;
      return data;
    },
  });

  const { data: inviteTokens, refetch } = useQuery({
    queryKey: ["invite-tokens"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("invite_tokens")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  const getRoleDisplay = (roleValue: string) => {
    const role = customRoles?.find(r => r.name === roleValue);
    return role?.display_name || roleValue;
  };

  const createTokenMutation = useMutation({
    mutationFn: async () => {
      if (!invitedEmail) {
        throw new Error("Email обязателен");
      }

      const token = crypto.randomUUID();

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("User not authenticated");

      const { data, error } = await supabase
        .from("invite_tokens")
        .insert({
          token,
          role: selectedRole,
          invited_email: invitedEmail,
          created_by: user.user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({
        title: "Инвайт создан",
        description: "Пригласительная ссылка успешно создана",
      });
      setInvitedEmail("");
      refetch();
      onInviteCreated?.();
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать инвайт: " + error.message,
        variant: "destructive",
      });
    },
  });

  const deleteTokenMutation = useMutation({
    mutationFn: async (tokenId: string) => {
      const { error } = await supabase
        .from("invite_tokens")
        .delete()
        .eq("id", tokenId);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({
        title: "Инвайт удален",
        description: "Пригласительная ссылка успешно удалена",
      });
      refetch();
      setDeleteTokenId(null);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось удалить инвайт: " + error.message,
        variant: "destructive",
      });
    },
  });

  const regenerateTokenMutation = useMutation({
    mutationFn: async (oldToken: any) => {
      const newToken = crypto.randomUUID();
      
      const { data, error } = await supabase
        .from("invite_tokens")
        .update({ 
          token: newToken, 
          created_at: new Date().toISOString() 
        })
        .eq("id", oldToken.id)
        .select("token, role")
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      toast({
        title: "Ссылка перегенерирована",
        description: "Новая пригласительная ссылка создана",
      });
      refetch();
      // Auto-copy new link
      copyToClipboard(data.token, data.role);
    },
    onError: (error) => {
      toast({
        title: "Ошибка",
        description: "Не удалось перегенерировать ссылку: " + error.message,
        variant: "destructive",
      });
    },
  });

  const copyToClipboard = (token: string, role: string) => {
    const registerPath = role === 'user' ? '/register' : '/register-staff';
    const inviteUrl = `${window.location.origin}${registerPath}?invite=${token}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopiedToken(token);
    toast({
      title: "Скопировано",
      description: "Пригласительная ссылка скопирована в буфер обмена",
    });
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const getStatusBadge = (token: any) => {
    if (token.used_at) {
      return <Badge variant="secondary">Использован</Badge>;
    }
    if (token.expires_at && new Date(token.expires_at) < new Date()) {
      return <Badge variant="destructive">Истёк</Badge>;
    }
    return <Badge variant="default">Активен</Badge>;
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Приглашения пользователей
          </CardTitle>
          <CardDescription>
            Создавайте пригласительные ссылки для регистрации новых пользователей с определенными ролями
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="email">Email приглашаемого *</Label>
              <Input
                id="email"
                type="email"
                placeholder="doctor@example.com"
                value={invitedEmail}
                onChange={(e) => setInvitedEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Роль</Label>
              <Select value={selectedRole} onValueChange={(v: any) => setSelectedRole(v)}>
                <SelectTrigger id="role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {customRoles?.map((role) => (
                    <SelectItem key={role.id} value={role.name}>
                      {role.display_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                onClick={() => createTokenMutation.mutate()}
                disabled={createTokenMutation.isPending || !invitedEmail}
                className="w-full"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Создать инвайт
              </Button>
            </div>
          </div>

          {inviteTokens && inviteTokens.length > 0 && (
            <div>
              <h3 className="text-sm font-medium mb-3">Активные инвайты</h3>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Роль</TableHead>
                      <TableHead>Статус</TableHead>
                      <TableHead>Создан</TableHead>
                      <TableHead className="w-[100px]">Действия</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inviteTokens.map((token) => (
                      <TableRow key={token.id}>
                        <TableCell className="font-medium">{token.invited_email}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="capitalize">
                            {getRoleDisplay(token.role)}
                          </Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(token)}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(token.created_at).toLocaleDateString("ru-RU")}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(token.token, token.role)}
                              disabled={token.used_at !== null || (token.expires_at && new Date(token.expires_at) < new Date())}
                            >
                              {copiedToken === token.token ? (
                                <Check className="w-4 h-4" />
                              ) : (
                                <Copy className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => regenerateTokenMutation.mutate(token)}
                              disabled={token.used_at !== null || (token.expires_at && new Date(token.expires_at) < new Date()) || regenerateTokenMutation.isPending}
                            >
                              <RefreshCw className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTokenId(token.id)}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <AlertDialog open={!!deleteTokenId} onOpenChange={() => setDeleteTokenId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить инвайт?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Пригласительная ссылка будет удалена навсегда.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTokenId && deleteTokenMutation.mutate(deleteTokenId)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
