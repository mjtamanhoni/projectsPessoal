unit uRotas;

{$mode Delphi}{$H+}

interface

uses
  SysUtils,
  DateUtils,
  fpjson,
  Classes,
  Windows,
  LCLIntf,
  Horse,
  Horse.Proc,
  Horse.Jhonson,
  Horse.CORS,
  fpjwt,
  Base64,
  Horse.JWT,
  ZDataset,
  uDataBase.Manager,
  uBase.Functions;

const
  SECRET = 'c7f9a1b2-48d3-4e6a-9d8a-2f1e6c4a9b7d';

type
  TMyClaims = class(TClaims)
  private
    FId: Integer;
    FEmpresa: Integer;
  published
    property id : Integer read FId write FId;
    property empresa : Integer read FEmpresa write FEmpresa;
  end;

function Criar_Token(ACod_Usuario, AEmpresa_Id :Integer):String;
function GetUsuarioFromToken(const Token: string): Integer;
function Get_Usuario_Request(AReq :THorseRequest):Integer;
function Get_Empresa_Request(AReq :THorseRequest):Integer;

procedure RegistrarRotas;
procedure Login(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Usuario_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Usuario_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Usuario_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Usuario_AlterarSenha(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Usuario_AlterarPin(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Fornecedor_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Fornecedor_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Fornecedor_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Cliente_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Cliente_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Cliente_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure CategoriaPagar_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure CategoriaPagar_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure CategoriaPagar_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure CategoriaReceber_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure CategoriaReceber_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure CategoriaReceber_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ContasPagar_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ContasPagar_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ContasPagar_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ContasPagar_Pagar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ContasPagar_Estornar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ContasReceber_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ContasReceber_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ContasReceber_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ContasReceber_Receber(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ContasReceber_Estornar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Servico_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Servico_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Servico_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure HorasTrabalhadas_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure HorasTrabalhadas_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure HorasTrabalhadas_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure HorasAbatidas_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure HorasAbatidas_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure HorasAbatidas_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure HorasExcedidas_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure HorasExcedidas_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure HorasExcedidas_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Dashboard_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Empresa_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Empresa_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Empresa_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Empresa_Listar_Publico(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Empresa_LimparDados(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Formulario_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Formulario_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Formulario_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure UsuarioFormulario_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure UsuarioFormulario_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure UsuarioFormulario_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Permissao_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure UsuarioFormularioPermissao_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure UsuarioFormularioPermissao_Salvar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Usuario_Permissoes(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Insumo_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Insumo_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Insumo_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure CompraInsumo_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure CompraInsumo_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure CompraInsumo_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ProdutoFabricado_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ProdutoFabricado_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ProdutoFabricado_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ReceitaIngrediente_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ReceitaIngrediente_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ReceitaIngrediente_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure CustoAdicionalTipo_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure CustoAdicionalTipo_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure CustoAdicionalTipo_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Fabricacao_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Fabricacao_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Fabricacao_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure VendaProduto_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure VendaProduto_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure VendaProduto_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure FabricacaoCustoAdicional_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure FabricacaoCustoAdicional_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure FabricacaoCustoAdicional_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure EstoqueInsumo_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure EstoqueInsumo_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure EstoqueInsumo_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure EstoqueProdutoFabricado_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure EstoqueProdutoFabricado_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure EstoqueProdutoFabricado_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Modulo_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Modulo_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure Modulo_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ModuloFormulario_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ModuloFormulario_Salvar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure ModuloFormulario_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure EmpresaModulo_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure EmpresaModulo_Salvar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure EmpresaModulo_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure UsuarioEmpresa_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure UsuarioEmpresa_Salvar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
procedure UsuarioEmpresa_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);

implementation

{ TMyClaims }

function ParamsText(const APairs: array of string): string;
var
  SB: TStringBuilder;
  I: Integer;
  Name :String;
  Value :String;
begin
  SB := TStringBuilder.Create;
  try
    SB.Append('Parâmetros').Append(sLineBreak).Append(sLineBreak);
    I := Low(APairs);
    while I <= High(APairs) do
    begin
      Name := APairs[I];
      Value := '';
      if I + 1 <= High(APairs) then
        Value := APairs[I + 1];
      SB.Append(Name).Append(': ').Append(Value).Append(sLineBreak);
      Inc(I, 2);
    end;
    Result := TrimRight(SB.ToString);
  finally
    SB.Free;
  end;
end;



procedure RegistrarRotas;
begin
  THorse
    .Post('/usuario/login',Login)
    .Get('/usuario/login',Login)
    .Get('/empresa',Empresa_Listar_Publico);

  THorse.AddCallback(HorseJWT(SECRET,THorseJWTConfig.New.SessionClass(TMyClaims)))
    .Get('/usuario',Usuario_Listar)
    .Post('/usuario',Usuario_Atualizar)
    .Put('/usuario',Usuario_Atualizar)
    .Delete('/usuario',Usuario_Excluir)
    .Put('/usuario/alterarSenha',Usuario_AlterarSenha)
    .Put('/usuario/alterarPin',Usuario_AlterarPin)
    .Get('/fornecedor',Fornecedor_Listar)
    .Post('/fornecedor',Fornecedor_Atualizar)
    .Delete('/fornecedor',Fornecedor_Excluir)
    .Get('/cliente',Cliente_Listar)
    .Post('/cliente',Cliente_Atualizar)
    .Delete('/cliente',Cliente_Excluir)
    .Get('/categoriaPagar',CategoriaPagar_Listar)
    .Post('/categoriaPagar',CategoriaPagar_Atualizar)
    .Delete('/categoriaPagar',CategoriaPagar_Excluir)
    .Get('/categoriaReceber',CategoriaReceber_Listar)
    .Post('/categoriaReceber',CategoriaReceber_Atualizar)
    .Delete('/categoriaReceber',CategoriaReceber_Excluir)
    .Get('/contasPagar',ContasPagar_Listar)
    .Post('/contasPagar',ContasPagar_Atualizar)
    .Delete('/contasPagar',ContasPagar_Excluir)
    .Put('/contasPagar/pagar',ContasPagar_Pagar)
    .Put('/contasPagar/estornar',ContasPagar_Estornar)
    .Get('/contasReceber',ContasReceber_Listar)
    .Post('/contasReceber',ContasReceber_Atualizar)
    .Delete('/contasReceber',ContasReceber_Excluir)
    .Put('/contasReceber/receber',ContasReceber_Receber)
    .Put('/contasReceber/estornar',ContasReceber_Estornar)
    .Get('/servico',Servico_Listar)
    .Post('/servico',Servico_Atualizar)
    .Delete('/servico',Servico_Excluir)
    .Get('/horasTrabalhadas',HorasTrabalhadas_Listar)
    .Post('/horasTrabalhadas',HorasTrabalhadas_Atualizar)
    .Delete('/horasTrabalhadas',HorasTrabalhadas_Excluir)
    .Get('/horasAbatidas',HorasAbatidas_Listar)
    .Post('/horasAbatidas',HorasAbatidas_Atualizar)
    .Delete('/horasAbatidas',HorasAbatidas_Excluir)
    .Get('/horasExcedidas',HorasExcedidas_Listar)
    .Post('/horasExcedidas',HorasExcedidas_Atualizar)
    .Delete('/horasExcedidas',HorasExcedidas_Excluir)
    .Get('/dashboard',Dashboard_Listar)
    .Get('/formulario',Formulario_Listar)
    .Post('/formulario',Formulario_Atualizar)
    .Delete('/formulario',Formulario_Excluir)
    .Get('/usuarioFormulario',UsuarioFormulario_Listar)
    .Post('/usuarioFormulario',UsuarioFormulario_Atualizar)
    .Delete('/usuarioFormulario',UsuarioFormulario_Excluir)
    .Get('/permissao',Permissao_Listar)
    .Get('/usuarioFormularioPermissao',UsuarioFormularioPermissao_Listar)
    .Post('/usuarioFormularioPermissao',UsuarioFormularioPermissao_Salvar)
    .Get('/usuarioPermissoes',Usuario_Permissoes)
    .Get('/insumo',Insumo_Listar)
    .Post('/insumo',Insumo_Atualizar)
    .Delete('/insumo',Insumo_Excluir)
    .Get('/compraInsumo',CompraInsumo_Listar)
    .Post('/compraInsumo',CompraInsumo_Atualizar)
    .Delete('/compraInsumo',CompraInsumo_Excluir)
    .Get('/produtoFabricado',ProdutoFabricado_Listar)
    .Post('/produtoFabricado',ProdutoFabricado_Atualizar)
    .Delete('/produtoFabricado',ProdutoFabricado_Excluir)
    .Get('/receitaIngrediente',ReceitaIngrediente_Listar)
    .Post('/receitaIngrediente',ReceitaIngrediente_Atualizar)
    .Delete('/receitaIngrediente',ReceitaIngrediente_Excluir)
    .Get('/custoAdicionalTipo',CustoAdicionalTipo_Listar)
    .Post('/custoAdicionalTipo',CustoAdicionalTipo_Atualizar)
    .Delete('/custoAdicionalTipo',CustoAdicionalTipo_Excluir)
    .Get('/fabricacao',Fabricacao_Listar)
    .Post('/fabricacao',Fabricacao_Atualizar)
    .Delete('/fabricacao',Fabricacao_Excluir)
    .Get('/vendaProduto',VendaProduto_Listar)
    .Post('/vendaProduto',VendaProduto_Atualizar)
    .Delete('/vendaProduto',VendaProduto_Excluir)
    .Get('/fabricacaoCustoAdicional',FabricacaoCustoAdicional_Listar)
    .Post('/fabricacaoCustoAdicional',FabricacaoCustoAdicional_Atualizar)
    .Delete('/fabricacaoCustoAdicional',FabricacaoCustoAdicional_Excluir)
    .Get('/estoqueInsumo',EstoqueInsumo_Listar)
    .Post('/estoqueInsumo',EstoqueInsumo_Atualizar)
    .Delete('/estoqueInsumo',EstoqueInsumo_Excluir)
    .Get('/estoqueProdutoFabricado',EstoqueProdutoFabricado_Listar)
    .Post('/estoqueProdutoFabricado',EstoqueProdutoFabricado_Atualizar)
    .Delete('/estoqueProdutoFabricado',EstoqueProdutoFabricado_Excluir)
    .Get('/modulo',Modulo_Listar)
    .Post('/modulo',Modulo_Atualizar)
    .Delete('/modulo',Modulo_Excluir)
    .Get('/moduloFormulario',ModuloFormulario_Listar)
    .Post('/moduloFormulario',ModuloFormulario_Salvar)
    .Delete('/moduloFormulario',ModuloFormulario_Excluir)
    .Get('/empresaModulo',EmpresaModulo_Listar)
    .Post('/empresaModulo',EmpresaModulo_Salvar)
    .Delete('/empresaModulo',EmpresaModulo_Excluir)
    .Get('/usuarioEmpresa',UsuarioEmpresa_Listar)
    .Post('/usuarioEmpresa',UsuarioEmpresa_Salvar)
    .Delete('/usuarioEmpresa',UsuarioEmpresa_Excluir)
    .Get('/empresa',Empresa_Listar)
    .Post('/empresa',Empresa_Atualizar)
    .Put('/empresa',Empresa_Atualizar)
    .Delete('/empresa',Empresa_Excluir)
    .Post('/empresa/limpar-dados',Empresa_LimparDados);

end;

function Criar_Token(ACod_Usuario, AEmpresa_Id :Integer):String;
var
  Header, Payload, Signature: string;
  HeaderObj, PayloadObj: TJSONObject;
  KeyBytes, MsgBytes: TBytes;
  Digest: TSHA256Digest;
  UTF8Key: string;
  UTF8Msg: UTF8String;
begin
  HeaderObj := TJSONObject.Create;
  HeaderObj.Add('alg', 'HS256');
  HeaderObj.Add('typ', 'JWT');
  Header := EncodeStringBase64(HeaderObj.AsJSON);
  Header := Header.Replace('+', '-').Replace('/', '_').Replace('=', '');
  HeaderObj.Free;

  PayloadObj := TJSONObject.Create;
  PayloadObj.Add('id', ACod_Usuario);
  PayloadObj.Add('empresa', AEmpresa_Id);
  PayloadObj.Add('iat', DateTimeToUnix(Now));
  PayloadObj.Add('exp', DateTimeToUnix(Now + 30));
  Payload := EncodeStringBase64(PayloadObj.AsJSON);
  Payload := Payload.Replace('+', '-').Replace('/', '_').Replace('=', '');
  PayloadObj.Free;

  UTF8Key := UTF8Encode(SECRET);
  SetLength(KeyBytes, Length(UTF8Key));
  if Length(UTF8Key) > 0 then Move(UTF8Key[1], KeyBytes[0], Length(UTF8Key));
  UTF8Msg := UTF8Encode(Header + '.' + Payload);
  SetLength(MsgBytes, Length(UTF8Msg));
  if Length(UTF8Msg) > 0 then Move(UTF8Msg[1], MsgBytes[0], Length(UTF8Msg));
  Digest := THMACHelper.HMACSHA256(KeyBytes, MsgBytes);

  SetLength(Signature, 32);
  Move(Digest, Signature[1], 32);
  Signature := EncodeStringBase64(Signature);
  Signature := Signature.Replace('+', '-').Replace('/', '_').Replace('=', '');

  Result := Header + '.' + Payload + '.' + Signature;
end;

function GetUsuarioFromToken(const Token: string): Integer;
var
  Parts: TArray<string>;
  PayloadBase64, PayloadDecoded: string;
  JObj: TJSONObject;
begin
  Result := 0;
  JObj := nil;

  Parts := Token.Split(['.']);
  if Length(Parts) >= 2 then
  begin
    PayloadBase64 := Parts[1];
    PayloadBase64 := PayloadBase64.Replace('-', '+').Replace('_', '/');
    while Length(PayloadBase64) mod 4 <> 0 do
      PayloadBase64 := PayloadBase64 + '=';

    PayloadDecoded := DecodeStringBase64(PayloadBase64);

    JObj := ParseJSONValue(PayloadDecoded) as TJSONObject;
    if Assigned(JObj) then
    try
      Result := JObj.GetValue('id', 0);
    finally
      JObj.Free;
    end;
  end;
end;

function Get_Usuario_Request(AReq :THorseRequest):Integer;
var
  Claims :TMyClaims;
  BaseClaims :TClaims;
  Token: string;
begin
  try
    Claims := AReq.Session<TMyClaims>;
    if Assigned(Claims) then
    begin
      Result := Claims.id;
      if Result > 0 then
        Exit;
    end;
  except
  end;

  try
    BaseClaims := AReq.Session<TClaims>;
    if Assigned(BaseClaims) then
    begin
      Claims := TMyClaims(BaseClaims);
      Result := Claims.id;
      if Result > 0 then
        Exit;
    end;
  except
  end;

  Token := Trim(AReq.Headers['Authorization']);
  if Token.StartsWith('Bearer ', True) then
    Token := Copy(Token, 8, Length(Token));

  if Token <> '' then
  begin
    Result := GetUsuarioFromToken(Token);
    if Result > 0 then
      Exit;
  end;

  raise Exception.Create('Sess�o inv�lida ou token expirado.');
end;

function Get_Empresa_Request(AReq :THorseRequest):Integer;
var
  Claims: TMyClaims;
  Token, PayloadBase64, PayloadDecoded: string;
  Parts: TArray<string>;
  JObj: TJSONObject;
begin
  try
    Claims := AReq.Session<TMyClaims>;
    if Assigned(Claims) then
    begin
      Result := Claims.empresa;
      if Result > 0 then
        Exit;
    end;
  except
  end;

  Token := Trim(AReq.Headers['Authorization']);
  if Token.StartsWith('Bearer ', True) then
    Token := Copy(Token, 8, Length(Token));

  if Token <> '' then
  begin
    Parts := Token.Split(['.']);
    if Length(Parts) >= 2 then
    begin
      PayloadBase64 := Parts[1];
      PayloadBase64 := PayloadBase64.Replace('-', '+').Replace('_', '/');
      while Length(PayloadBase64) mod 4 <> 0 do
        PayloadBase64 := PayloadBase64 + '=';
      PayloadDecoded := DecodeStringBase64(PayloadBase64);
      JObj := ParseJSONValue(PayloadDecoded) as TJSONObject;
      if Assigned(JObj) then
      try
        Result := JObj.GetValue('empresa', 0);
        if Result > 0 then
          Exit;
      finally
        JObj.Free;
      end;
    end;
  end;

  Result := 1;
end;

procedure Login(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fPIN, fLogin, fSenha :String;
  fEmpresa_Id, fUsuario_Id: Integer;
  fBody: TJSONObject;
  fJsonRet: TJSONObject;
  fDataBaseManager :TDataBaseManager;
  lJsonIn: string;
  lJsonOut: string;
begin
  fJsonRet := nil;
  fDataBaseManager := TDataBaseManager.Create;

  lJsonIn := '';
  lJsonOut := '';
  fPIN := '';
  fLogin := '';
  fSenha := '';

  try
    try
      if SameText(Req.RawWebRequest.Method, 'GET') then
      begin
        fPIN := Trim(Req.Query['pin']);
        fLogin := Trim(Req.Query['login']);
        fSenha := Trim(Req.Query['senha']);
        fEmpresa_Id := StrToIntDef(Trim(Req.Query['empresa']),1);
      end
      else
      begin
        fBody := Req.Body<TJSONObject>;
        if Assigned(fBody) then
        begin
          fPIN := Trim(fBody.GetValue('pin', ''));
          fLogin := Trim(fBody.GetValue('login', ''));
          fSenha := Trim(fBody.GetValue('senha', ''));
          fEmpresa_Id := StrToIntDef(Trim(fBody.GetValue('empresa', '')),1);
        end;
      end;

      if fPIN.IsEmpty then
      begin
        if fLogin.IsEmpty or fSenha.IsEmpty then
        begin
          Res.Send(TJSONObject.Create.AddPair('erro', 'Par�metro pin n�o informado.').AsJSON).Status(400);
          Exit;
        end;
      end;

      {
      if SameText(Req.RawWebRequest.Method, 'GET') then
        lJsonIn := ParamsText(['Pin', QuotedStr('***'), 'Empresa', fEmpresa_Id.ToString])
      else
      begin
        lJsonIn := Trim(Req.Body);
        if lJsonIn = '' then
          lJsonIn := ParamsText(['Pin', QuotedStr('***'), 'Empresa', fEmpresa_Id.ToString]);
      end;
      }
      with fDataBaseManager.Login(fPIN,fLogin,fSenha,fEmpresa_Id,fJsonRet,fUsuario_Id) do
      begin
        case Id of
          200 :begin
            if not fDataBaseManager.VerificarUsuarioEmpresa(fUsuario_Id, fEmpresa_Id) then
            begin
              lJsonOut := 'Usu�rio n�o possui acesso a empresa selecionada.';
              Res.Send(TJSONObject.Create.AddPair('erro', lJsonOut).AsJSON).Status(403);
              Exit;
            end;
            fJsonRet.AddPair('token',Criar_Token(fUsuario_Id, fEmpresa_Id));
            lJsonOut := fJsonRet.ToString;
            Res.Send<TJSONObject>(fJsonRet).Status(Id);
            //GravarLogJSON('uRotas', 'Login realizado', 'uRotas', cLogTipoLogin, fUsuario_Id.ToString, lJsonIn, lJsonOut, '', 'empresa=' + fEmpresa_Id.ToString, nil);
          end;
          401 :begin
            lJsonOut := Menssage;
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            //GravarLogJSON('uRotas', 'Login', 'uRotas', cLogTipoLogin, '', lJsonIn, lJsonOut, '', 'Status=' + Id.ToString, nil);
          end;
          404: begin
            lJsonOut := Menssage;
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            //GravarLogJSON('uRotas', 'Login', 'uRotas', cLogTipoLogin, '', lJsonIn, lJsonOut, '', 'Status=' + Id.ToString, nil);
          end;
        else
          lJsonOut := 'N�o Identificado.';
          Res.Send(TJSONObject.Create.AddPair('erro', 'N�o Identificado.').AsJSON).Status(Id);
          //GravarLogJSON('uRotas', 'Login', 'uRotas', cLogTipoLogin, '', lJsonIn, lJsonOut, '', 'Status=' + Id.ToString, nil);
        end;
      end;

    except
      on E: Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', 'Erro interno no servidor.').AsJSON).Status(500);
        //GravarLogJSON('uRotas', 'Login - erro interno', 'uRotas', cLogTipoLogin, '', lJsonIn, lJsonOut, '', '', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Fornecedor_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmail :String;
  fNome :String;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fNome := Req.Query['nome'];
      fEmail := Req.Query['email'];
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      {
      var lJsonIn: string := ParamsText([
        'Codigo', fCodigo.ToString,
        'CodFilial', fFilial.ToString,
        'Descricao', QuotedStr(fNome),
        'Pagina', fPagina.ToString,
        'Paginas', fPaginas.ToString
      ]);
      lJsonOut := '';
      }

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Fornecedor_Listar(lJson_Ret,fId,fNome,fEmail,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Fornecedor - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Fornecedor - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Fornecedor - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Fornecedor - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Fornecedor - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Fornecedor - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Fornecedor_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  fEmpresaId: Integer;
  lInner: TJSONData;
  lJsonOut: string;

begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;

  try
    try
      fId := Get_Usuario_Request(Req);
      fEmpresaId := Get_Empresa_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Fornecedores ou um objeto de Fornecedor.');

      with fDataBaseManager.Fornecedor_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Fornecedores', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Fornecedores Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Fornecedores', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Fornecedor_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fEmpresaId := Get_Empresa_Request(Req);

      with fDataBaseManager.Fornecedor_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Fornecedor ' + fId.ToString + ' exclu�do com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Fornecedor ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Fornecedor ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Fornecedor ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir o Fornecedor ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir o Fornecedor', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Cliente_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fNome :String;
  fEmail :String;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fNome   := Req.Query['nome'];
      fEmail   := Req.Query['email'];
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Cliente_Listar(lJson_Ret,fId,fNome,fEmail,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Cliente - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Cliente - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Cliente - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Cliente - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Cliente - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Cliente - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Cliente_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fId: Integer;
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;

  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Clientes ou um objeto de Cliente.');

      with fDataBaseManager.Cliente_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Clientes', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Clientes Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Clientes', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Cliente_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId:= StrToIntDef(Req.Query['id'],0);
      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Cliente_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Cliente ' + fId.ToString + ' exclu�do com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Cliente ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Cliente ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Cliente ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir o Cliente ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir o Cliente', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure CategoriaPagar_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fNome: String;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fNome := Req.Query['nome'];
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.CategoriaPagar_Listar(lJson_Ret,fId,fNome,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Categoria Pagar - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Categoria Pagar - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Categoria Pagar - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Categoria Pagar - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Categoria Pagar - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Categoria Pagar - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure CategoriaPagar_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;

begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;

  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);

      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Categorias ou um objeto de Categoria.');

      with fDataBaseManager.CategoriaPagar_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Categorias', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Categorias Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Categorias', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure CategoriaPagar_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.CategoriaPagar_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Categoria ' + fId.ToString + ' exclu�da com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Categoria ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Categoria ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Categoria ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir a Categoria ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir a Categoria', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure CategoriaReceber_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
  fNome :String;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fNome   := Req.Query['nome'];
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.CategoriaReceber_Listar(lJson_Ret,fId,fNome,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Categoria Receber - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Categoria Receber - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Categoria Receber - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Categoria Receber - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Categoria Receber - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Categoria Receber - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure CategoriaReceber_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Categorias ou um objeto de Categoria.');

      with fDataBaseManager.CategoriaReceber_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Categorias Receber', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Categorias Receber Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Categorias Receber', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure CategoriaReceber_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.CategoriaReceber_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Categoria Receber ' + fId.ToString + ' exclu�da com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Categoria Receber ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Categoria Receber ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Categoria Receber ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir a Categoria Receber ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir a Categoria Receber', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ContasPagar_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fFornecedorId: Integer;
  fDescricao: string;
  fDataInicial: TDateTime;
  fDataFinal: TDateTime;
  fPago: Integer;
  fPagina: Integer;
  fPaginas: Integer;
  lData: string;
  fEmpresaId: Integer;
  LogMsg: string;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fFornecedorId := StrToIntDef(Req.Query['fornecedor_id'],0);
      fDescricao := Req.Query['descricao'];
      fDataInicial := 0;
      fDataFinal := 0;
      fPago := -1;
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      if Req.Query['data_inicial'] <> '' then
      begin
        lData := Req.Query['data_inicial'];
        fDataInicial := EncodeDate(StrToInt(Copy(lData,1,4)), StrToInt(Copy(lData,6,2)), StrToInt(Copy(lData,9,2)));
      end;
      if Req.Query['data_final'] <> '' then
      begin
        lData := Req.Query['data_final'];
        fDataFinal := EncodeDate(StrToInt(Copy(lData,1,4)), StrToInt(Copy(lData,6,2)), StrToInt(Copy(lData,9,2)));
      end;
      if Req.Query['pago'] <> '' then
      fPago := StrToIntDef(Req.Query['pago'], -1);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.ContasPagar_Listar(lJson_Ret,fId,fFornecedorId,fDescricao,fDataInicial,fDataFinal,fPago,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Contas Pagar - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Contas Pagar - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Contas Pagar - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Contas Pagar - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Contas Pagar - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        GravarLogJSON('uRotas', 'Contas Pagar - Listagem', 'uRotas', E);
        LogMsg := E.Message;
        OutputDebugString(PChar(FormatDateTime('dd/mm/yyyy hh:nn:ss', Now) + ' - [ContasPagar_Listar] ' + LogMsg));
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ContasPagar_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  fEmpresaId: Integer;
  lInner: TJSONData;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      fEmpresaId := Get_Empresa_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Contas ou um objeto de Conta.');

      with fDataBaseManager.ContasPagar_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Contas Pagar', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Contas Pagar Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Contas Pagar', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ContasPagar_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.ContasPagar_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Conta Pagar ' + fId.ToString + ' exclu�da com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Conta Pagar ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Conta Pagar ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Conta Pagar ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir a Conta Pagar ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir a Conta Pagar', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ContasPagar_Pagar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager :TDataBaseManager;
  lBody: TJSONObject;
  fId: Integer;
  fDataPagamento: TDateTime;
  fValorBaixa: Double;
  fDesconto: Double;
  fAcrescimo: Double;
  LDataPagStr: string;
  fEmpresaId: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  try
    try
      Get_Usuario_Request(Req);
      lBody := Req.Body<TJSONObject>;
      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido.');

      fId := lBody.GetValue('id', 0);
      LDataPagStr := lBody.GetValue('data_pagamento', '');
      if LDataPagStr <> '' then
        fDataPagamento := EncodeDate(
          StrToInt(Copy(LDataPagStr, 1, 4)),
          StrToInt(Copy(LDataPagStr, 6, 2)),
          StrToInt(Copy(LDataPagStr, 9, 2))
        )
      else
        fDataPagamento := 0;
      fValorBaixa := lBody.GetValue('valorBaixa', 0);
      fDesconto := lBody.GetValue('desconto', 0);
      fAcrescimo := lBody.GetValue('acrescimo', 0);

      if fId <= 0 then
        raise Exception.Create('C�digo da Conta a Pagar n�o informado.');

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.ContasPagar_Pagar(fId, fDataPagamento, fEmpresaId, fValorBaixa, fDesconto, fAcrescimo) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(JSonObject).Status(Id);
            GravarLogJSON('uRotas', 'Pagamento registrado', 'uRotas', nil);
          end;
          400, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao registrar pagamento', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao registrar pagamento', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Pagamento', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ContasPagar_Estornar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager :TDataBaseManager;
  lBody: TJSONObject;
  fId: Integer;
  fEmpresaId: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  try
    try
      Get_Usuario_Request(Req);
      lBody := Req.Body<TJSONObject>;
      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido.');

      fId := lBody.GetValue('id', 0);

      if fId <= 0 then
        raise Exception.Create('C�digo da Conta a Pagar n�o informado.');

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.ContasPagar_Estornar(fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(JSonObject).Status(Id);
            GravarLogJSON('uRotas', 'Estorno de pagamento realizado', 'uRotas', nil);
          end;
          400, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao estornar pagamento', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao estornar pagamento', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Estorno de pagamento', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ContasReceber_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fClienteId: Integer;
  fDescricao: string;
  fDataInicial: TDateTime;
  fDataFinal: TDateTime;
  fRecebido: Integer;
  fPagina: Integer;
  fPaginas: Integer;
  lData: string;
  fEmpresaId: Integer;
  LogMsg: string;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fClienteId := StrToIntDef(Req.Query['cliente_id'],0);
      fDescricao := Req.Query['descricao'];
      fDataInicial := 0;
      fDataFinal := 0;
      fRecebido := -1;
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      if Req.Query['data_inicial'] <> '' then
      begin
        lData := Req.Query['data_inicial'];
        fDataInicial := EncodeDate(StrToInt(Copy(lData,1,4)), StrToInt(Copy(lData,6,2)), StrToInt(Copy(lData,9,2)));
      end;
      if Req.Query['data_final'] <> '' then
      begin
        lData := Req.Query['data_final'];
        fDataFinal := EncodeDate(StrToInt(Copy(lData,1,4)), StrToInt(Copy(lData,6,2)), StrToInt(Copy(lData,9,2)));
      end;
      if Req.Query['recebido'] <> '' then
      fRecebido := StrToIntDef(Req.Query['recebido'], -1);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.ContasReceber_Listar(lJson_Ret,fId,fClienteId,fDescricao,fDataInicial,fDataFinal,fRecebido,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Contas Receber - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Contas Receber - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Contas Receber - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Contas Receber - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Contas Receber - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        GravarLogJSON('uRotas', 'Contas Receber - Listagem', 'uRotas', E);
        LogMsg := E.Message;
        OutputDebugString(PChar(FormatDateTime('dd/mm/yyyy hh:nn:ss', Now) + ' - [ContasReceber_Listar] ' + LogMsg));
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ContasReceber_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Contas ou um objeto de Conta.');

      with fDataBaseManager.ContasReceber_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Contas Receber', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Contas Receber Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Contas Receber', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ContasReceber_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.ContasReceber_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Conta Receber ' + fId.ToString + ' exclu�da com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Conta Receber ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Conta Receber ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Conta Receber ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir a Conta Receber ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir a Conta Receber', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ContasReceber_Receber(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager :TDataBaseManager;
  lBody: TJSONObject;
  fId: Integer;
  fDataRecebimento: TDateTime;
  fValorBaixa: Double;
  fDesconto: Double;
  fAcrescimo: Double;
  LDataRecStr: string;
  fEmpresaId: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  try
    try
      Get_Usuario_Request(Req);
      lBody := Req.Body<TJSONObject>;
      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido.');

      fId := lBody.GetValue('id', 0);
      LDataRecStr := lBody.GetValue('data_recebimento', '');
      if LDataRecStr <> '' then
        fDataRecebimento := EncodeDate(
          StrToInt(Copy(LDataRecStr, 1, 4)),
          StrToInt(Copy(LDataRecStr, 6, 2)),
          StrToInt(Copy(LDataRecStr, 9, 2))
        )
      else
        fDataRecebimento := 0;
      fValorBaixa := lBody.GetValue('valorBaixa', 0);
      fDesconto := lBody.GetValue('desconto', 0);
      fAcrescimo := lBody.GetValue('acrescimo', 0);

      if fId <= 0 then
        raise Exception.Create('C�digo da Conta a Receber n�o informado.');

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.ContasReceber_Receber(fId, fDataRecebimento, fEmpresaId, fValorBaixa, fDesconto, fAcrescimo) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(JSonObject).Status(Id);
            GravarLogJSON('uRotas', 'Recebimento registrado', 'uRotas', nil);
          end;
          400, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao registrar recebimento', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao registrar recebimento', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Recebimento', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ContasReceber_Estornar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager :TDataBaseManager;
  lBody: TJSONObject;
  fId: Integer;
  fEmpresaId: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  try
    try
      Get_Usuario_Request(Req);
      lBody := Req.Body<TJSONObject>;
      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido.');

      fId := lBody.GetValue('id', 0);

      if fId <= 0 then
        raise Exception.Create('C�digo da Conta a Receber n�o informado.');

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.ContasReceber_Estornar(fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(JSonObject).Status(Id);
            GravarLogJSON('uRotas', 'Estorno de recebimento realizado', 'uRotas', nil);
          end;
          400, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao estornar recebimento', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao estornar recebimento', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Estorno de recebimento', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Servico_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
  fNome :String;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fNome   := Req.Query['nome'];
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Servico_Listar(lJson_Ret,fId,fNome,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Servi�o - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Servi�o - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Servi�o - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Servi�o - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Servi�o - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Servi�o - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Servico_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Servi�os ou um objeto de Servi�o.');

      with fDataBaseManager.Servico_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Servi�os', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Servi�os Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Servi�os', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Servico_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Servico_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Servi�o ' + fId.ToString + ' exclu�do com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Servi�o ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Servi�o ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Servi�o ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir o Servi�o ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir o Servi�o', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure HorasTrabalhadas_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fUsuarioId: Integer;
  fClienteId: Integer;
  fServicoId: Integer;
  fDataInicial: TDateTime;
  fDataFinal: TDateTime;
  fPagina: Integer;
  fPaginas: Integer;
  lData: string;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fUsuarioId := StrToIntDef(Req.Query['usuario_id'],0);
      fClienteId := StrToIntDef(Req.Query['cliente_id'],0);
      fServicoId := StrToIntDef(Req.Query['servico_id'],0);
      fDataInicial := 0;
      fDataFinal := 0;
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      if Req.Query['data_inicial'] <> '' then
      begin
        lData := Req.Query['data_inicial'];
        fDataInicial := EncodeDate(StrToInt(Copy(lData,1,4)), StrToInt(Copy(lData,6,2)), StrToInt(Copy(lData,9,2)));
      end;
      if Req.Query['data_final'] <> '' then
      begin
        lData := Req.Query['data_final'];
        fDataFinal := EncodeDate(StrToInt(Copy(lData,1,4)), StrToInt(Copy(lData,6,2)), StrToInt(Copy(lData,9,2)));
      end;

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.HorasTrabalhadas_Listar(lJson_Ret,fId,fUsuarioId,fClienteId,fServicoId,fDataInicial,fDataFinal,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Horas Trabalhadas - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Horas Trabalhadas - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Horas Trabalhadas - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Horas Trabalhadas - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Horas Trabalhadas - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Horas Trabalhadas - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure HorasTrabalhadas_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Horas Trabalhadas ou um objeto de Horas Trabalhadas.');

      with fDataBaseManager.HorasTrabalhadas_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Horas Trabalhadas', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Horas Trabalhadas Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Horas Trabalhadas', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure HorasTrabalhadas_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.HorasTrabalhadas_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Horas Trabalhadas ' + fId.ToString + ' exclu�das com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir as Horas Trabalhadas ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir as Horas Trabalhadas ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir as Horas Trabalhadas ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir as Horas Trabalhadas ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir as Horas Trabalhadas', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure HorasAbatidas_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fDataInicial: TDateTime;
  fDataFinal: TDateTime;
  fId: Integer;
  fUsuarioId: Integer;
  fPagina: Integer;
  fPaginas: Integer;
  lData: string;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  fDataInicial := 0;
  fDataFinal := 0;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fUsuarioId := StrToIntDef(Req.Query['usuario_id'],0);
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      if Req.Query['data_inicial'] <> '' then
      begin
        lData := Req.Query['data_inicial'];
        fDataInicial := EncodeDate(StrToInt(Copy(lData,1,4)), StrToInt(Copy(lData,6,2)), StrToInt(Copy(lData,9,2)));
      end;
      if Req.Query['data_final'] <> '' then
      begin
        lData := Req.Query['data_final'];
        fDataFinal := EncodeDate(StrToInt(Copy(lData,1,4)), StrToInt(Copy(lData,6,2)), StrToInt(Copy(lData,9,2)));
      end;

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.HorasAbatidas_Listar(lJson_Ret,fId,fUsuarioId,fDataInicial,fDataFinal,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Horas Abatidas - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Horas Abatidas - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Horas Abatidas - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Horas Abatidas - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Horas Abatidas - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure HorasAbatidas_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Abatimentos ou um objeto de Abatimento.');

      with fDataBaseManager.HorasAbatidas_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Horas Abatidas', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Horas Abatidas Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Horas Abatidas', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure HorasAbatidas_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.HorasAbatidas_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Abatimento ' + fId.ToString + ' exclu�do com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Abatimento ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Abatimento ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Abatimento ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir o Abatimento ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir o Abatimento', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure HorasExcedidas_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fUsuarioId: Integer;
  fClienteId: Integer;
  fServicoId: Integer;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
  fAnoOrigem :Integer;
  fMesOrigem :Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fUsuarioId := StrToIntDef(Req.Query['usuario_id'],0);
      fClienteId := StrToIntDef(Req.Query['cliente_id'],0);
      fServicoId := StrToIntDef(Req.Query['servico_id'],0);
      fAnoOrigem := StrToIntDef(Req.Query['ano_origem'],0);
      fMesOrigem := StrToIntDef(Req.Query['mes_origem'],0);
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.HorasExcedidas_Listar(lJson_Ret,fId,fUsuarioId,fClienteId,fServicoId,fAnoOrigem,fMesOrigem,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Horas Excedidas - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Horas Excedidas - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Horas Excedidas - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Horas Excedidas - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Horas Excedidas - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure HorasExcedidas_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de registros ou um objeto.');

      with fDataBaseManager.HorasExcedidas_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Horas Excedidas', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Horas Excedidas Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Horas Excedidas', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure HorasExcedidas_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.HorasExcedidas_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Horas Excedidas ' + fId.ToString + ' exclu�do com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir Horas Excedidas ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir Horas Excedidas ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir Horas Excedidas ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir Horas Excedidas ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir Horas Excedidas', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Dashboard_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lJsonRet: TJSONObject;
  lDataInicial, lDataFinal: TDateTime;
  lData: string;
  fEmpresaId: Integer;
begin
  lJsonRet := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      if Req.Query['dataInicial'] <> '' then
      begin
        lData := Req.Query['dataInicial'];
        lDataInicial := EncodeDate(StrToInt(Copy(lData,1,4)), StrToInt(Copy(lData,6,2)), StrToInt(Copy(lData,9,2)));
      end;
      if Req.Query['dataFinal'] <> '' then
      begin
        lData := Req.Query['dataFinal'];
        lDataFinal := EncodeDate(StrToInt(Copy(lData,1,4)), StrToInt(Copy(lData,6,2)), StrToInt(Copy(lData,9,2)));
      end;

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Dashboard_Listar(lJsonRet, lDataInicial, lDataFinal, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJsonRet).Status(Id);
            GravarLogJSON('uRotas', 'Dashboard - Listagem', 'uRotas', nil);
          end;
          400, 403, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Dashboard - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Dashboard - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      on E: EConvertError do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', 'Formato de data inv�lido. Use DD/MM/YYYY.').AsJSON).Status(400);
        GravarLogJSON('uRotas', 'Dashboard - Listagem', 'uRotas', E);
      end;
      On E: Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Dashboard - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Usuario_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
  fNome :String;
  fEmail :String;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fNome   := Req.Query['nome'];
      fEmail   := Req.Query['email'];
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Usuario_Listar(lJson_Ret,fId,fNome,fEmail,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Usu�rio - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Usu�rio - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Usu�rio - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Usu�rio - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Usu�rio - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Usu�rio - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Usuario_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Usu�rios ou um objeto de Usu�rio.');

      with fDataBaseManager.Usuario_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Usu�rios', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Usu�rios Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Usu�rios', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Usuario_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Usuario_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Usu�rio ' + fId.ToString + ' exclu�do com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Usu�rio ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Usu�rio ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Usu�rio ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir o Usu�rio ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir o Usu�rio', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Usuario_AlterarSenha(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager :TDataBaseManager;
  lBody: TJSONObject;
  fId: Integer;
  fSenhaAtual: String;
  fNovaSenha: String;
  fEmpresaId: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  try
    try
      Get_Usuario_Request(Req);
      lBody := Req.Body<TJSONObject>;
      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido.');

      fId := lBody.GetValue('id', 0);
      fSenhaAtual := lBody.GetValue('senha_atual', '');
      fNovaSenha := lBody.GetValue('nova_senha', '');

      if fId <= 0 then
        raise Exception.Create('C�digo do Usu�rio n�o informado.');

      if fNovaSenha = '' then
        raise Exception.Create('Nova senha n�o informada.');

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Usuario_AlterarSenha(fId, fSenhaAtual, fNovaSenha, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(JSonObject).Status(Id);
            GravarLogJSON('uRotas', 'Senha alterada', 'uRotas', nil);
          end;
          400, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao alterar senha', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao alterar senha', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Alterar senha', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Usuario_AlterarPin(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager :TDataBaseManager;
  lBody: TJSONObject;
  fId: Integer;
  fNovoPin: String;
  fEmpresaId: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  try
    try
      Get_Usuario_Request(Req);
      lBody := Req.Body<TJSONObject>;
      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido.');

      fId := lBody.GetValue('id', 0);
      fNovoPin := lBody.GetValue('novo_pin', '');

      if fId <= 0 then
        raise Exception.Create('C�digo do Usu�rio n�o informado.');

      if fNovoPin = '' then
        raise Exception.Create('Novo PIN n�o informado.');

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Usuario_AlterarPin(fId, fNovoPin, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(JSonObject).Status(Id);
            GravarLogJSON('uRotas', 'PIN alterado', 'uRotas', nil);
          end;
          400, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao alterar PIN', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao alterar PIN', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Alterar PIN', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Formulario_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
  fNome: String;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fNome   := Req.Query['nome'];
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Formulario_Listar(lJson_Ret,fId,fNome,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Formul�rio - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Formul�rio - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Formul�rio - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Formul�rio - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Formul�rio - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Formul�rio - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Formulario_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Formul�rios ou um objeto de Formul�rio.');

      with fDataBaseManager.Formulario_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Formul�rios', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Formul�rios Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Formul�rios', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Formulario_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Formulario_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Formul�rio ' + fId.ToString + ' exclu�do com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Formul�rio ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Formul�rio ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Formul�rio ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir o Formul�rio ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir o Formul�rio', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure UsuarioFormulario_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fUsuarioId: Integer;
  fFormularioId: Integer;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fUsuarioId := StrToIntDef(Req.Query['usuario_id'],0);
      fFormularioId := StrToIntDef(Req.Query['formulario_id'],0);
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.UsuarioFormulario_Listar(lJson_Ret,fId,fUsuarioId,fFormularioId,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Usu�rio Formul�rio - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Usu�rio Formul�rio - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Usu�rio Formul�rio - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Usu�rio Formul�rio - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Usu�rio Formul�rio - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Usu�rio Formul�rio - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure UsuarioFormulario_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de V�nculos ou um objeto de V�nculo.');

      with fDataBaseManager.UsuarioFormulario_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando V�nculos Usu�rio/Formul�rio', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando V�nculos Usu�rio/Formul�rio Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando V�nculos Usu�rio/Formul�rio', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure UsuarioFormulario_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;

  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.UsuarioFormulario_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'V�nculo ' + fId.ToString + ' exclu�do com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o V�nculo ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o V�nculo ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o V�nculo ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir o V�nculo ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir o V�nculo', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Permissao_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Permissao_Listar(lJson_Ret, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Permiss�es - Listagem', 'uRotas', nil);
          end;
          400, 403, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Permiss�es - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Permiss�es - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Permiss�es - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure UsuarioFormularioPermissao_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['usuario_formulario_id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.UsuarioFormularioPermissao_Listar(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Permiss�es do V�nculo - Listagem', 'uRotas', nil);
          end;
          400, 403, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Permiss�es do V�nculo - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Permiss�es do V�nculo - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Permiss�es do V�nculo - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure UsuarioFormularioPermissao_Salvar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONObject;
  fId: Integer;
  fPermissoes: TJSONArray;
  fEmpresaId: Integer;
  fUsuarioFormularioId: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  try
    try
      fId := Get_Usuario_Request(Req);
      lBody := ParseJSONValue(Req.Body) as TJSONObject;

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido.');

      fUsuarioFormularioId := lBody.GetValue('usuario_formulario_id', 0);
      fPermissoes := lBody.Get('permissoes', TJSONArray(nil));

      if fUsuarioFormularioId = 0 then
        raise Exception.Create('usuario_formulario_id � obrigat�rio.');

      if not Assigned(fPermissoes) then
        raise Exception.Create('permissoes � obrigat�rio.');

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.UsuarioFormularioPermissao_Salvar(fUsuarioFormularioId, fPermissoes, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            if Assigned(JSonObject) then
              Res.Send<TJSONObject>(JSonObject).Status(Id)
            else
              Res.Send(Menssage).Status(Id);
            GravarLogJSON('uRotas', 'Permiss�es do V�nculo - Salvar', 'uRotas', nil);
          end;
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Permiss�es do V�nculo - Salvar Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Permiss�es do V�nculo - Salvar', 'uRotas', E);
      end;
    end;
  finally
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Usuario_Permissoes(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fUsuarioId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fUsuarioId := Get_Usuario_Request(Req);
      fEmpresaId := Get_Empresa_Request(Req);

      with fDataBaseManager.Usuario_Permissoes(lJson_Ret, fUsuarioId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Permiss�es do Usu�rio - Listagem', 'uRotas', nil);
          end;
          400, 403, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Permiss�es do Usu�rio - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Permiss�es do Usu�rio - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Permiss�es do Usu�rio - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

{ Insumo }

procedure Insumo_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fNome: string;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fNome := Req.Query['nome'];
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Insumo_Listar(lJson_Ret,fId,fNome,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Insumo - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Insumo - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Insumo - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Insumo - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Insumo - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Insumo - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Insumo_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Insumos ou um objeto de Insumo.');

      with fDataBaseManager.Insumo_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Insumos', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Insumos Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Insumos', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Insumo_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Insumo_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Insumo ' + fId.ToString + ' exclu�do com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Insumo ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Insumo ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Insumo ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir o Insumo ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir o Insumo', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

{ Compra Insumo }

procedure CompraInsumo_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fInsumoId: Integer;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
  fDataInicial :TDateTime;
  fDataFinal :TDateTime;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fInsumoId := StrToIntDef(Req.Query['insumo_id'],0);
      fDataInicial := StrToDateTimeDef(Req.Query['data_inicial'],0);
      fDataFinal := StrToDateTimeDef(Req.Query['data_final'],0);
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.CompraInsumo_Listar(lJson_Ret,fId,fInsumoId,fDataInicial,fDataFinal,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Compra Insumo - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Compra Insumo - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Compra Insumo - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Compra Insumo - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Compra Insumo - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Compra Insumo - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure CompraInsumo_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Compras de Insumo ou um objeto de Compra de Insumo.');

      with fDataBaseManager.CompraInsumo_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Compras de Insumo', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Compras de Insumo Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Compras de Insumo', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure CompraInsumo_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.CompraInsumo_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Compra Insumo ' + fId.ToString + ' exclu�da com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Compra Insumo ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Compra Insumo ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Compra Insumo ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir a Compra Insumo ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir a Compra Insumo', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

{ Produto Fabricado }

procedure ProdutoFabricado_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fNome: string;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fNome := Req.Query['nome'];
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.ProdutoFabricado_Listar(lJson_Ret,fId,fNome,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Produto Fabricado - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Produto Fabricado - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Produto Fabricado - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Produto Fabricado - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Produto Fabricado - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Produto Fabricado - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ProdutoFabricado_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Produtos Fabricados ou um objeto de Produto Fabricado.');

      with fDataBaseManager.ProdutoFabricado_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Produtos Fabricados', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Produtos Fabricados Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Produtos Fabricados', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ProdutoFabricado_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.ProdutoFabricado_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Produto Fabricado ' + fId.ToString + ' exclu�do com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Produto Fabricado ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Produto Fabricado ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Produto Fabricado ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir o Produto Fabricado ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir o Produto Fabricado', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

{ Receita Ingrediente }

procedure ReceitaIngrediente_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fProdutoFabricadoId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fProdutoFabricadoId := StrToIntDef(Req.Query['produto_fabricado_id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.ReceitaIngrediente_Listar(lJson_Ret,fId,fProdutoFabricadoId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Receita Ingrediente - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Receita Ingrediente - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Receita Ingrediente - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Receita Ingrediente - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Receita Ingrediente - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Receita Ingrediente - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ReceitaIngrediente_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Ingredientes da Receita ou um objeto de Ingrediente da Receita.');

      with fDataBaseManager.ReceitaIngrediente_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Ingredientes da Receita', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Ingredientes da Receita Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Ingredientes da Receita', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ReceitaIngrediente_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.ReceitaIngrediente_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Receita Ingrediente ' + fId.ToString + ' exclu�do com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Receita Ingrediente ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Receita Ingrediente ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Receita Ingrediente ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir o Receita Ingrediente ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir o Receita Ingrediente', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

{ Custo Adicional Tipo }

procedure CustoAdicionalTipo_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fNome: string;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fNome := Req.Query['nome'];

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.CustoAdicionalTipo_Listar(lJson_Ret,fId,fNome, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Custo Adicional Tipo - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Custo Adicional Tipo - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Custo Adicional Tipo - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Custo Adicional Tipo - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Custo Adicional Tipo - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Custo Adicional Tipo - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure CustoAdicionalTipo_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Custos Adicionais Tipo ou um objeto de Custo Adicional Tipo.');

      with fDataBaseManager.CustoAdicionalTipo_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Custos Adicionais Tipo', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Custos Adicionais Tipo Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Custos Adicionais Tipo', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure CustoAdicionalTipo_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.CustoAdicionalTipo_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Custo Adicional Tipo ' + fId.ToString + ' exclu�do com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Custo Adicional Tipo ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Custo Adicional Tipo ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Custo Adicional Tipo ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir o Custo Adicional Tipo ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir o Custo Adicional Tipo', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

{ Fabricacao }

procedure Fabricacao_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fProdutoFabricadoId: Integer;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
  fDataInicial :TDateTime;
  fDataFinal :TDateTime;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fProdutoFabricadoId := StrToIntDef(Req.Query['produto_fabricado_id'],0);
      fDataInicial := StrToDateTimeDef(Req.Query['data_inicial'],0);
      fDataFinal := StrToDateTimeDef(Req.Query['data_final'],0);
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Fabricacao_Listar(lJson_Ret,fId,fProdutoFabricadoId,fDataInicial,fDataFinal,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Fabrica��o - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Fabrica��o - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Fabrica��o - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Fabrica��o - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Fabrica��o - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Fabrica��o - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Fabricacao_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Fabrica��es ou um objeto de Fabrica��o.');

      with fDataBaseManager.Fabricacao_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Fabrica��es', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Fabrica��es Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Fabrica��es', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Fabricacao_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.Fabricacao_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Fabrica��o ' + fId.ToString + ' exclu�da com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Fabrica��o ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Fabrica��o ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Fabrica��o ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir a Fabrica��o ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir a Fabrica��o', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

{ Venda Produto }

procedure VendaProduto_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fProdutoFabricadoId: Integer;
  fClienteId: Integer;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
  fDataInicial :TDateTime;
  fDataFinal :TDateTime;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fProdutoFabricadoId := StrToIntDef(Req.Query['produto_fabricado_id'],0);
      fClienteId := StrToIntDef(Req.Query['cliente_id'],0);
      fDataInicial := StrToDateTimeDef(Req.Query['data_inicial'],0);
      fDataFinal := StrToDateTimeDef(Req.Query['data_final'],0);
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.VendaProduto_Listar(lJson_Ret,fId,fProdutoFabricadoId,fClienteId,fDataInicial,fDataFinal,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Venda Produto - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Venda Produto - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Venda Produto - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Venda Produto - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Venda Produto - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Venda Produto - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure VendaProduto_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Vendas de Produto ou um objeto de Venda de Produto.');

      with fDataBaseManager.VendaProduto_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Vendas de Produto', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Vendas de Produto Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Vendas de Produto', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure VendaProduto_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.VendaProduto_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Venda Produto ' + fId.ToString + ' exclu�da com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Venda Produto ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Venda Produto ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir a Venda Produto ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir a Venda Produto ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir a Venda Produto', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure FabricacaoCustoAdicional_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fFabricacaoId: Integer;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fFabricacaoId := StrToIntDef(Req.Query['fabricacao_id'],0);
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.FabricacaoCustoAdicional_Listar(lJson_Ret,fFabricacaoId,fPagina,fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Fabricacao Custo Adicional - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Fabricacao Custo Adicional - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Fabricacao Custo Adicional - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Fabricacao Custo Adicional - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Fabricacao Custo Adicional - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Fabricacao Custo Adicional - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure FabricacaoCustoAdicional_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array de Custos Adicionais ou um objeto de Custo Adicional.');

      with fDataBaseManager.FabricacaoCustoAdicional_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Custos Adicionais da Fabrica��o', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Custos Adicionais da Fabrica��o Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E:Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Custos Adicionais da Fabrica��o', 'uRotas',E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure FabricacaoCustoAdicional_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONObject;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.FabricacaoCustoAdicional_Delete(lJson_Ret,fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Custo Adicional da Fabrica��o ' + fId.ToString + ' exclu�do com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Custo Adicional da Fabrica��o ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Custo Adicional da Fabrica��o ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Custo Adicional da Fabrica��o ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir o Custo Adicional da Fabrica��o ' + fId.ToString, 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir o Custo Adicional da Fabrica��o', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

{ Estoque Insumo }

procedure EstoqueInsumo_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret: TJSONArray;
  fDataBaseManager: TDataBaseManager;
  fId: Integer;
  fInsumoId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'], 0);
      fInsumoId := StrToIntDef(Req.Query['insumo_id'], 0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.EstoqueInsumo_Listar(lJson_Ret, fId, fInsumoId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
        end;
      end;
    except
      On E: Exception do
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure EstoqueInsumo_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  lInner: TJSONData;
  fEmpresaId: Integer;
  fId: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  try
    try
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);
      fId := Get_Usuario_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array ou um objeto.');

      with fDataBaseManager.EstoqueInsumo_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            if Assigned(JSonObject) then
              Res.Send<TJSONObject>(JSonObject).Status(id)
            else
              Res.Send(Menssage).Status(id);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        end;
      end;
    except
      On E: Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure EstoqueInsumo_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret: TJSONObject;
  fDataBaseManager: TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'], 0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.EstoqueInsumo_Delete(lJson_Ret, fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
        end;
      end;
    except
      On E: Exception do
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

{ Estoque Produto Fabricado }

procedure EstoqueProdutoFabricado_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret: TJSONArray;
  fDataBaseManager: TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
  fProdutoId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'], 0);
      fProdutoId := StrToIntDef(Req.Query['produto_fabricado_id'], 0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.EstoqueProdutoFabricado_Listar(lJson_Ret, fId, fProdutoId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
        end;
      end;
    except
      On E: Exception do
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure EstoqueProdutoFabricado_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  lInner: TJSONData;
  fEmpresaId: Integer;
  fId: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  try
    try
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);
      fId := Get_Usuario_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON inv�lido. Envie um array ou um objeto.');

      with fDataBaseManager.EstoqueProdutoFabricado_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            if Assigned(JSonObject) then
              Res.Send<TJSONObject>(JSonObject).Status(id)
            else
              Res.Send(Menssage).Status(id);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        end;
      end;
    except
      On E: Exception do
      begin
        if Pos('Sess�o', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure EstoqueProdutoFabricado_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret: TJSONObject;
  fDataBaseManager: TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'], 0);

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.EstoqueProdutoFabricado_Delete(lJson_Ret, fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
        end;
      end;
    except
      On E: Exception do
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Empresa_Listar_Publico(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      with fDataBaseManager.Empresa_Listar(lJson_Ret) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
        end;
      end;
    except
      On E:Exception do
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Empresa_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret :TJSONArray;
  fDataBaseManager :TDataBaseManager;
  fId: Integer;
  fPagina: Integer;
  fPaginas: Integer;
  fNome :String;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'],0);
      fNome   := Req.Query['nome'];
      fPagina := StrToIntDef(Req.Query['pagina'],0);
      fPaginas := StrToIntDef(Req.Query['paginas'],0);

      with fDataBaseManager.Empresa_Listar(lJson_Ret,fId,fNome,fPagina,fPaginas) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Empresa - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Empresa - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Empresa - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Empresa - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Empresa - Listagem', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Empresa - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Empresa_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fEmpresaId: Integer;
  fUsuarioId: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  try
    try
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end;

      if not Assigned(lBody) then
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', 'JSON inv�lido').AsJSON).Status(400);
        Exit;
      end;

      fEmpresaId := Get_Empresa_Request(Req);
      fUsuarioId := Get_Usuario_Request(Req);
      with fDataBaseManager.Empresa_Atualizar(lBody, fEmpresaId, fUsuarioId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(JsonObject).Status(Id);
            GravarLogJSON('uRotas', 'Empresa - Atualizar', 'uRotas', nil);
          end;
          400, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Empresa - Atualizar', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Empresa - Atualizar', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E:Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Empresa - Atualizar', 'uRotas', E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Empresa_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret: TJSONObject;
  fDataBaseManager: TDataBaseManager;
  fId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'], 0);

      with fDataBaseManager.Empresa_Delete(lJson_Ret, fId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
        end;
      end;
    except
      On E: Exception do
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Empresa_LimparDados(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lJsonIn: TJSONObject;
  fEmpresaId: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fEmpresaId := StrToIntDef(Req.Query['empresa_id'], 0);
      if fEmpresaId = 0 then
      begin
        lJsonIn := Req.Body<TJSONObject>;
        if Assigned(lJsonIn) then
        fEmpresaId := lJsonIn.GetValue('empresa_id', 0);
      end;

      if fEmpresaId <= 0 then
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', 'C�digo da Empresa n�o informado.').AsJSON).Status(400);
        Exit;
      end;

      with fDataBaseManager.Empresa_LimparDados(fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(JsonObject).Status(Id);
            GravarLogJSON('uRotas', 'Empresa - Limpar Dados', 'uRotas', nil);
          end;
          400: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Empresa - Limpar Dados', 'uRotas', Exception.Create(Menssage));
          end;
          500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Empresa - Limpar Dados', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Empresa - Limpar Dados', 'uRotas', Exception.Create('C�digo de retorno n�o tratado: ' + Id.ToString));
        end;
      end;
    except
      On E: Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Empresa - Limpar Dados', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

{ Modulo }

procedure Modulo_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret: TJSONArray;
  fDataBaseManager: TDataBaseManager;
  fId: Integer;
  fNome: string;
  fPagina: Integer;
  fPaginas: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'], 0);
      fNome := Req.Query['nome'];
      fPagina := StrToIntDef(Req.Query['pagina'], 0);
      fPaginas := StrToIntDef(Req.Query['paginas'], 0);
      fEmpresaId := Get_Empresa_Request(Req);

      with fDataBaseManager.Modulo_Listar(lJson_Ret, fId, fNome, fPagina, fPaginas, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Modulo - Listagem', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Modulo - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Modulo - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Modulo - Listagem', 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Modulo - Listagem', 'uRotas', Exception.Create('Codigo de retorno nao tratado: ' + Id.ToString));
        end;
      end;
    except
      On E: Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Modulo - Listagem', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Modulo_Atualizar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONArray;
  lValue: TJSONData;
  fId: Integer;
  lInner: TJSONData;
  fEmpresaId: Integer;
  lJsonOut: string;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  lValue := nil;
  fId := 0;
  try
    try
      fId := Get_Usuario_Request(Req);
      lValue := ParseJSONValue(Req.Body);
      if (lValue is TJSONArray) then
      begin
        lBody := TJSONArray(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONObject) then
      begin
        lBody := TJSONArray.Create;
        lBody.Add(lValue);
        lValue := nil;
      end
      else if (lValue is TJSONString) then
      begin
        lInner := ParseJSONValue(lValue.AsString);
        lValue.Free;
        lValue := lInner;
        if (lValue is TJSONArray) then
        begin
          lBody := TJSONArray(lValue);
          lValue := nil;
        end
        else if (lValue is TJSONObject) then
        begin
          lBody := TJSONArray.Create;
          lBody.Add(lValue);
          lValue := nil;
        end;
      end;

      fEmpresaId := Get_Empresa_Request(Req);

      if not Assigned(lBody) then
        raise Exception.Create('JSON invalido. Envie um array de Modulos ou um objeto de Modulo.');

      with fDataBaseManager.Modulo_Atualizar(lBody, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            lJsonOut := '';
            if Assigned(JSonObject) then
            begin
              lJsonOut := JSonObject.ToString;
              Res.Send<TJSONObject>(JSonObject).Status(id)
            end
            else
            begin
              lJsonOut := Menssage;
              Res.Send(Menssage).Status(id);
            end;
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Modulos', 'uRotas', nil);
          end
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Inserindo/Atualizando Modulos Erro', 'uRotas', Exception.Create(Menssage));
          end;
        end;
      end;
    except
      On E: Exception do
      begin
        if Pos('Sessao', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Inserindo/Atualizando Modulos', 'uRotas', E);
      end;
    end;
  finally
    lValue.Free;
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure Modulo_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret: TJSONObject;
  fDataBaseManager: TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'], 0);
      fEmpresaId := Get_Empresa_Request(Req);

      with fDataBaseManager.Modulo_Delete(lJson_Ret, fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONObject>(lJson_Ret).Status(Id);
            GravarLogJSON('uRotas', 'Modulo ' + fId.ToString + ' excluido com sucesso', 'uRotas', nil);
          end;
          400, 403, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Modulo ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          401: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Modulo ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
          404: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
            GravarLogJSON('uRotas', 'Erro ao excluir o Modulo ' + fId.ToString, 'uRotas', Exception.Create(Menssage));
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
          GravarLogJSON('uRotas', 'Erro ao excluir o Modulo ' + fId.ToString, 'uRotas', Exception.Create('Codigo de retorno nao tratado: ' + Id.ToString));
        end;
      end;
    except
      On E: Exception do
      begin
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
        GravarLogJSON('uRotas', 'Erro ao excluir o Modulo', 'uRotas', E);
      end;
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

{ Modulo Formulario }

procedure ModuloFormulario_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret: TJSONArray;
  fDataBaseManager: TDataBaseManager;
  fModuloId: Integer;
  fFormularioId: Integer;
  fEmpresaId: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fModuloId := StrToIntDef(Req.Query['modulo_id'], 0);
      fFormularioId := StrToIntDef(Req.Query['formulario_id'], 0);
      fEmpresaId := Get_Empresa_Request(Req);

      with fDataBaseManager.ModuloFormulario_Listar(lJson_Ret, fModuloId, fFormularioId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
          end;
          400, 403, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
        end;
      end;
    except
      On E: Exception do
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ModuloFormulario_Salvar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONObject;
  fId: Integer;
  fModuloId: Integer;
  fFormularios: TJSONArray;
  fEmpresaId: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  try
    try
      fId := Get_Usuario_Request(Req);
      lBody := ParseJSONValue(Req.Body) as TJSONObject;

      if not Assigned(lBody) then
        raise Exception.Create('JSON invalido.');

      fModuloId := lBody.GetValue('modulo_id', 0);
      fFormularios := lBody.Get('formularios', TJSONArray(nil));

      if fModuloId = 0 then
        raise Exception.Create('modulo_id e obrigatorio.');

      if not Assigned(fFormularios) then
        raise Exception.Create('formularios e obrigatorio.');

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.ModuloFormulario_Salvar(fModuloId, fFormularios, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            if Assigned(JSonObject) then
              Res.Send<TJSONObject>(JSonObject).Status(Id)
            else
              Res.Send(Menssage).Status(Id);
          end;
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        end;
      end;
    except
      On E: Exception do
      begin
        if Pos('Sessao', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
      end;
    end;
  finally
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

{ Empresa Modulo }

procedure EmpresaModulo_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret: TJSONArray;
  fDataBaseManager: TDataBaseManager;
  fModuloId: Integer;
  fEmpresaId: Integer;
  fEmpresaIdFiltro: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fEmpresaIdFiltro := StrToIntDef(Req.Query['empresa_id'], 0);
      fModuloId := StrToIntDef(Req.Query['modulo_id'], 0);
      fEmpresaId := Get_Empresa_Request(Req);

      with fDataBaseManager.EmpresaModulo_Listar(lJson_Ret, fEmpresaIdFiltro, fModuloId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
          end;
          400, 403, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
        end;
      end;
    except
      On E: Exception do
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure EmpresaModulo_Salvar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONObject;
  fId: Integer;
  fModulos: TJSONArray;
  fEmpresaId: Integer;
  fEmpresaIdAlvo: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  try
    try
      fId := Get_Usuario_Request(Req);
      lBody := ParseJSONValue(Req.Body) as TJSONObject;

      if not Assigned(lBody) then
        raise Exception.Create('JSON invalido.');

      fEmpresaIdAlvo := lBody.GetValue('empresa_id', 0);
      fModulos := lBody.Get('modulos', TJSONArray(nil));

      if fEmpresaIdAlvo = 0 then
        raise Exception.Create('empresa_id e obrigatorio.');

      if not Assigned(fModulos) then
        raise Exception.Create('modulos e obrigatorio.');

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.EmpresaModulo_Salvar(fEmpresaIdAlvo, fModulos, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            if Assigned(JSonObject) then
              Res.Send<TJSONObject>(JSonObject).Status(Id)
            else
              Res.Send(Menssage).Status(Id);
          end;
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        end;
      end;
    except
      On E: Exception do
      begin
        if Pos('Sessao', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
      end;
    end;
  finally
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure ModuloFormulario_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'], 0);
      fEmpresaId := Get_Empresa_Request(Req);

      with fDataBaseManager.ModuloFormulario_Delete(fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send(Menssage).Status(Id);
          end;
          400, 403, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
        end;
      end;
    except
      On E: Exception do
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure EmpresaModulo_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'], 0);
      fEmpresaId := Get_Empresa_Request(Req);

      with fDataBaseManager.EmpresaModulo_Delete(fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send(Menssage).Status(Id);
          end;
          400, 403, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
        end;
      end;
    except
      On E: Exception do
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

{ UsuarioEmpresa }

procedure UsuarioEmpresa_Listar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  lJson_Ret: TJSONArray;
  fDataBaseManager: TDataBaseManager;
  fEmpresaId: Integer;
  fUsuarioIdFiltro: Integer;
  fEmpresaIdFiltro: Integer;
begin
  lJson_Ret := nil;
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fUsuarioIdFiltro := StrToIntDef(Req.Query['usuario_id'], 0);
      fEmpresaIdFiltro := StrToIntDef(Req.Query['empresa_id'], 0);
      fEmpresaId := Get_Empresa_Request(Req);

      with fDataBaseManager.UsuarioEmpresa_Listar(lJson_Ret, fUsuarioIdFiltro, fEmpresaIdFiltro, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send<TJSONArray>(lJson_Ret).Status(Id);
          end;
          400, 403, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
        end;
      end;
    except
      On E: Exception do
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure UsuarioEmpresa_Salvar(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  lBody: TJSONObject;
  fId: Integer;
  fEmpresas: TJSONArray;
  fEmpresaId: Integer;
  fUsuarioIdAlvo: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  lBody := nil;
  try
    try
      fId := Get_Usuario_Request(Req);
      lBody := ParseJSONValue(Req.Body) as TJSONObject;

      if not Assigned(lBody) then
        raise Exception.Create('JSON invalido.');

      fUsuarioIdAlvo := lBody.GetValue('usuario_id', 0);
      fEmpresas := lBody.Get('empresas', TJSONArray(nil));

      if fUsuarioIdAlvo = 0 then
        raise Exception.Create('usuario_id e obrigatorio.');

      if not Assigned(fEmpresas) then
        raise Exception.Create('empresas e obrigatorio.');

      fEmpresaId := Get_Empresa_Request(Req);
      with fDataBaseManager.UsuarioEmpresa_Salvar(fUsuarioIdAlvo, fEmpresas, fEmpresaId, fId) do
      begin
        case Id of
          200: begin
            if Assigned(JSonObject) then
              Res.Send<TJSONObject>(JSonObject).Status(Id)
            else
              Res.Send(Menssage).Status(Id);
          end;
        else
          begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        end;
      end;
    except
      On E: Exception do
      begin
        if Pos('Sessao', E.Message) > 0 then
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(401)
        else
          Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
      end;
    end;
  finally
    lBody.Free;
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

procedure UsuarioEmpresa_Excluir(Req: THorseRequest; Res: THorseResponse; Next: TNextProc);
var
  fDataBaseManager: TDataBaseManager;
  fId: Integer;
  fEmpresaId: Integer;
begin
  fDataBaseManager := TDataBaseManager.Create;
  try
    try
      fId := StrToIntDef(Req.Query['id'], 0);
      fEmpresaId := Get_Empresa_Request(Req);

      with fDataBaseManager.UsuarioEmpresa_Delete(fId, fEmpresaId) do
      begin
        case Id of
          200: begin
            Res.Send(Menssage).Status(Id);
          end;
          400, 403, 404, 500: begin
            Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(Id);
          end;
        else
          Res.Send(TJSONObject.Create.AddPair('erro', Menssage).AsJSON).Status(500);
        end;
      end;
    except
      On E: Exception do
        Res.Send(TJSONObject.Create.AddPair('erro', E.Message).AsJSON).Status(500);
    end;
  finally
    if Assigned(fDataBaseManager) then
      fDataBaseManager.Free;
  end;
end;

end.
