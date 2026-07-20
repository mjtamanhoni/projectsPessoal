unit uDataBase.Manager;

interface

uses
  System.SysUtils,
  System.DateUtils,
  System.Math,
  System.JSON,
  System.Net.HttpClient,
  System.Classes,
  System.Variants,

  FireDAC.Comp.Client,
  DataSet.Serialize,
  Data.DB,

  uDm, uBase.Functions;

type
  TReturn = record
    Id :Integer;
    Menssage :String;
    JSonObject :TJSONObject;
    JSonArray :TJSONArray;
  end;

  TDataBaseManager = class
  private
    procedure RecalcularCustoMedio(const aInsumoId: Integer; const aEmpresaId: Integer; const aFDConnection: TFDConnection);
    procedure AtualizarEstoqueInsumo(const aInsumoId: Integer; const aDelta: Double; const aDataAtualizacao: TDateTime; const aEmpresaId: Integer; const aFDConnection: TFDConnection);
    procedure AtualizarEstoqueProdutoFabricado(const aProdutoFabricadoId: Integer; const aDelta: Double; const aDataAtualizacao: TDateTime; const aEmpresaId: Integer; const aFDConnection: TFDConnection);
  public
    constructor Create;
    destructor Destroy; override;

    //Usuários...
    function Login(const aPin, ALogin, ASenha: String; const aFilial: Integer; out fJson:TJSONObject; out FCod_Usuario:Integer):TReturn;
    function Usuario_Listar(
      out fJson:TJSONArray;
      const aId: Integer = 0;
      const aNome: String = '';
      const aEmail: String = '';
      const APagina:Integer=0;
      const APaginas:Integer=0;
      const aEmpresaId: Integer = 0): TReturn;
    function Usuario_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer):TReturn;
    function Usuario_Delete(out fJson:TJSONObject;const aId:Integer=0; const aEmpresaId: Integer = 0):TReturn;
    function Usuario_AlterarSenha(const aId: Integer; const aSenhaAtual, aNovaSenha: String; const aEmpresaId: Integer = 0):TReturn;
    function Usuario_AlterarPin(const aId: Integer; const aNovoPin: String; const aEmpresaId: Integer = 0):TReturn;

    //Fornecedores
    function Fornecedor_Listar(
      out fJson:TJSONArray;
      const aId: Integer = 0;
      const aNome: String = '';
      const aEmail: String = '';
      const APagina:Integer=0;
      const APaginas:Integer=0;
      const aEmpresaId: Integer = 0): TReturn;
    function Fornecedor_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer):TReturn;
    function Fornecedor_Delete(out fJson:TJSONObject;const aId:Integer=0; const aEmpresaId: Integer = 0):TReturn;

    //Clientes
    function Cliente_Listar(
      out fJson:TJSONArray;
      const aId: Integer = 0;
      const aNome: String = '';
      const aEmail: String = '';
      const APagina:Integer=0;
      const APaginas:Integer=0;
      const aEmpresaId: Integer = 0): TReturn;
    function Cliente_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer):TReturn;
    function Cliente_Delete(out fJson:TJSONObject;const aId:Integer=0; const aEmpresaId: Integer = 0):TReturn;

    //Categoria Pagar
    function CategoriaPagar_Listar(
      out fJson:TJSONArray;
      const aId: Integer = 0;
      const aNome: String = '';
      const APagina:Integer=0;
      const APaginas:Integer=0;
      const aEmpresaId: Integer = 0): TReturn;
    function CategoriaPagar_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer):TReturn;
    function CategoriaPagar_Delete(out fJson:TJSONObject;const aId:Integer=0; const aEmpresaId: Integer = 0):TReturn;

    //Categoria Receber
    function CategoriaReceber_Listar(
      out fJson:TJSONArray;
      const aId: Integer = 0;
      const aNome: String = '';
      const APagina:Integer=0;
      const APaginas:Integer=0;
      const aEmpresaId: Integer = 0): TReturn;
    function CategoriaReceber_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer):TReturn;
    function CategoriaReceber_Delete(out fJson:TJSONObject;const aId:Integer=0; const aEmpresaId: Integer = 0):TReturn;

    //Contas Pagar
    function ContasPagar_Listar(
      out fJson:TJSONArray;
      const aId: Integer = 0;
      const aFornecedorId: Integer = 0;
      const aDescricao: String = '';
      const aDataInicial: TDateTime = 0;
      const aDataFinal: TDateTime = 0;
      const aPago: Integer = -1;
      const APagina:Integer=0;
      const APaginas:Integer=0;
      const aEmpresaId: Integer = 0): TReturn;
    function ContasPagar_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer):TReturn;
    function ContasPagar_Delete(out fJson:TJSONObject;const aId:Integer=0; const aEmpresaId: Integer = 0):TReturn;
    function ContasPagar_Pagar(const aId: Integer; const aDataPagamento: TDateTime; const aEmpresaId: Integer = 0; const aValorBaixa: Double = 0; const aDesconto: Double = 0; const aAcrescimo: Double = 0):TReturn;
    function ContasPagar_Estornar(const aId: Integer; const aEmpresaId: Integer = 0):TReturn;

    //Contas Receber
    function ContasReceber_Listar(
      out fJson:TJSONArray;
      const aId: Integer = 0;
      const aClienteId: Integer = 0;
      const aDescricao: String = '';
      const aDataInicial: TDateTime = 0;
      const aDataFinal: TDateTime = 0;
      const aRecebido: Integer = -1;
      const APagina:Integer=0;
      const APaginas:Integer=0;
      const aEmpresaId: Integer = 0): TReturn;
    function ContasReceber_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer):TReturn;
    function ContasReceber_Delete(out fJson:TJSONObject;const aId:Integer=0; const aEmpresaId: Integer = 0):TReturn;
    function ContasReceber_Receber(const aId: Integer; const aDataRecebimento: TDateTime; const aEmpresaId: Integer = 0; const aValorBaixa: Double = 0; const aDesconto: Double = 0; const aAcrescimo: Double = 0):TReturn;
    function ContasReceber_Estornar(const aId: Integer; const aEmpresaId: Integer = 0):TReturn;

    //Dashboard
    function Dashboard_Listar(out fJson: TJSONObject; const aDataInicial, aDataFinal: TDateTime; const aEmpresaId: Integer = 0): TReturn;

    //Formulário
    function Formulario_Listar(
      out fJson:TJSONArray;
      const aId: Integer = 0;
      const aNome: String = '';
      const APagina:Integer=0;
      const APaginas:Integer=0;
      const aEmpresaId: Integer = 0): TReturn;
    function Formulario_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer):TReturn;
    function Formulario_Delete(out fJson:TJSONObject;const aId:Integer=0; const aEmpresaId: Integer = 0):TReturn;

    //Serviços
    function Servico_Listar(
      out fJson:TJSONArray;
      const aId: Integer = 0;
      const aNome: String = '';
      const APagina:Integer=0;
      const APaginas:Integer=0;
      const aEmpresaId: Integer = 0): TReturn;
    function Servico_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer):TReturn;
    function Servico_Delete(out fJson:TJSONObject;const aId:Integer=0; const aEmpresaId: Integer = 0):TReturn;

    //Horas Trabalhadas
    function HorasTrabalhadas_Listar(
      out fJson:TJSONArray;
      const aId: Integer = 0;
      const aUsuarioId: Integer = 0;
      const aClienteId: Integer = 0;
      const aServicoId: Integer = 0;
      const aDataInicial: TDateTime = 0;
      const aDataFinal: TDateTime = 0;
      const APagina:Integer=0;
      const APaginas:Integer=0;
      const aEmpresaId: Integer = 0): TReturn;
    function HorasTrabalhadas_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer):TReturn;
    function HorasTrabalhadas_Delete(out fJson:TJSONObject;const aId:Integer=0; const aEmpresaId: Integer = 0):TReturn;

    //Horas Abatidas
    function HorasAbatidas_Listar(
      out fJson:TJSONArray;
      const aId: Integer = 0;
      const aUsuarioId: Integer = 0;
      const aDataInicial: TDateTime = 0;
      const aDataFinal: TDateTime = 0;
      const APagina:Integer=0;
      const APaginas:Integer=0;
      const aEmpresaId: Integer = 0): TReturn;
    function HorasAbatidas_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer):TReturn;
    function HorasAbatidas_Delete(out fJson:TJSONObject;const aId:Integer=0; const aEmpresaId: Integer = 0):TReturn;

    //Horas Excedidas
    function HorasExcedidas_Listar(
      out fJson:TJSONArray;
      const aId: Integer = 0;
      const aUsuarioId: Integer = 0;
      const aClienteId: Integer = 0;
      const aServicoId: Integer = 0;
      const aAnoOrigem: Integer = 0;
      const aMesOrigem: Integer = 0;
      const APagina:Integer=0;
      const APaginas:Integer=0;
      const aEmpresaId: Integer = 0): TReturn;
    function HorasExcedidas_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer):TReturn;
    function HorasExcedidas_Delete(out fJson:TJSONObject;const aId:Integer=0; const aEmpresaId: Integer = 0):TReturn;

    //Usuário Formulário
    function UsuarioFormulario_Listar(
      out fJson:TJSONArray;
      const aId: Integer = 0;
      const aUsuarioId: Integer = 0;
      const aFormularioId: Integer = 0;
      const APagina:Integer=0;
      const APaginas:Integer=0;
      const aEmpresaId: Integer = 0): TReturn;
    function UsuarioFormulario_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer):TReturn;
    function UsuarioFormulario_Delete(out fJson:TJSONObject;const aId:Integer=0; const aEmpresaId: Integer = 0):TReturn;

    //Permissões
    function Permissao_Listar(out fJson:TJSONArray; const aEmpresaId: Integer = 0):TReturn;
    function UsuarioFormularioPermissao_Listar(
      out fJson:TJSONArray;
      const aUsuarioFormularioId: Integer = 0;
      const aEmpresaId: Integer = 0): TReturn;
    function UsuarioFormularioPermissao_Salvar(
      const aUsuarioFormularioId: Integer;
      const aPermissoes: TJSONArray;
      const aEmpresaId: Integer;
      const aUsuarioId: Integer): TReturn;
    function Usuario_Permissoes(
      out fJson: TJSONArray;
      const aUsuarioId: Integer;
      const aEmpresaId: Integer = 0): TReturn;

    //Empresa
    function Empresa_Listar(
      out fJson:TJSONArray;
      const aId: Integer = 0;
      const aNome: String = '';
      const APagina:Integer=0;
      const APaginas:Integer=0;
      const aEmpresaId: Integer = 0): TReturn;
    function Empresa_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
    function Empresa_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;

    //Insumos
    function Insumo_Listar(out fJson:TJSONArray; const aId:Integer=0; const aNome:String=''; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
    function Insumo_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
    function Insumo_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;

    //Compra Insumo
    function CompraInsumo_Listar(out fJson:TJSONArray; const aId:Integer=0; const aInsumoId:Integer=0; const aDataInicial:TDateTime=0; const aDataFinal:TDateTime=0; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
    function CompraInsumo_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
    function CompraInsumo_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;

    //Produto Fabricado
    function ProdutoFabricado_Listar(out fJson:TJSONArray; const aId:Integer=0; const aNome:String=''; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
    function ProdutoFabricado_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
    function ProdutoFabricado_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;

    //Receita Ingrediente
    function ReceitaIngrediente_Listar(out fJson:TJSONArray; const aId:Integer=0; const aProdutoFabricadoId:Integer=0; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
    function ReceitaIngrediente_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
    function ReceitaIngrediente_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;

    //Custo Adicional Tipo
    function CustoAdicionalTipo_Listar(out fJson:TJSONArray; const aId:Integer=0; const aNome:String=''; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
    function CustoAdicionalTipo_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
    function CustoAdicionalTipo_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;

    //Fabricacao
    function Fabricacao_Listar(out fJson:TJSONArray; const aId:Integer=0; const aProdutoFabricadoId:Integer=0; const aDataInicial:TDateTime=0; const aDataFinal:TDateTime=0; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
    function Fabricacao_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
    function Fabricacao_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;

    //Fabricacao Custo Adicional
    function FabricacaoCustoAdicional_Listar(out fJson:TJSONArray; const aFabricacaoId:Integer=0; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
    function FabricacaoCustoAdicional_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
    function FabricacaoCustoAdicional_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;

    //Venda Produto
    function VendaProduto_Listar(out fJson:TJSONArray; const aId:Integer=0; const aProdutoFabricadoId:Integer=0; const aClienteId:Integer=0; const aDataInicial:TDateTime=0; const aDataFinal:TDateTime=0; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
    function VendaProduto_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer = 0): TReturn;
    function VendaProduto_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;

    //Estoque Insumo
    function EstoqueInsumo_Listar(out fJson:TJSONArray; const aId:Integer=0; const aInsumoId:Integer=0; const aEmpresaId:Integer=0): TReturn;
    function EstoqueInsumo_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
    function EstoqueInsumo_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;

    //Estoque Produto Fabricado
    function EstoqueProdutoFabricado_Listar(out fJson:TJSONArray; const aId:Integer=0; const aProdutoFabricadoId:Integer=0; const aEmpresaId:Integer=0): TReturn;
    function EstoqueProdutoFabricado_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
    function EstoqueProdutoFabricado_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;

    //Modulo
    function Modulo_Listar(out fJson:TJSONArray; const aId:Integer=0; const aNome:String=''; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
    function Modulo_Atualizar(const aJSon:TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
    function Modulo_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;

    //Modulo Formulario
    function ModuloFormulario_Listar(out fJson:TJSONArray; const aModuloId:Integer=0; const aFormularioId:Integer=0; const aEmpresaId:Integer=0): TReturn;
    function ModuloFormulario_Salvar(const aModuloId: Integer; const aFormularios: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
    function ModuloFormulario_Delete(const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;

    //Empresa Modulo
    function EmpresaModulo_Listar(out fJson:TJSONArray; const aEmpresaIdFiltro:Integer=0; const aModuloId:Integer=0; const aEmpresaId:Integer=0): TReturn;
    function EmpresaModulo_Salvar(const aEmpresaIdAlvo: Integer; const aModulos: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
    function EmpresaModulo_Delete(const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;

    //Usuario Empresa
    function UsuarioEmpresa_Listar(out fJson:TJSONArray; const aUsuarioIdFiltro:Integer=0; const aEmpresaIdFiltro:Integer=0; const aEmpresaId:Integer=0): TReturn;
    function UsuarioEmpresa_Salvar(const aUsuarioIdAlvo: Integer; const aEmpresas: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
    function UsuarioEmpresa_Delete(const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
    function VerificarUsuarioEmpresa(const aUsuarioId: Integer; const aEmpresaId: Integer): Boolean;
    function Empresa_LimparDados(const aEmpresaId: Integer): TReturn;

  end;

implementation

{ TDataBaseManager }

constructor TDataBaseManager.Create;
begin
  inherited Create;
end;

destructor TDataBaseManager.Destroy;
begin
  inherited Destroy;
end;

function TDataBaseManager.Fornecedor_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;

begin

  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;


  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if Trim(LObj.GetValue<String>('nome','')) = '' then
        begin
          Result.Id := 404;
          Result.Menssage := 'Nome do Fornecedor não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.SQL.Add('MERGE INTO public.fornecedor f ');
        FDQ_Append.SQL.Add('USING ( ');
        FDQ_Append.SQL.Add('  SELECT ');
        FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
        FDQ_Append.SQL.Add('    ,CAST(:nome AS VARCHAR(100)) AS nome ');
        FDQ_Append.SQL.Add('    ,CAST(:telefone AS VARCHAR(20)) AS telefone ');
        FDQ_Append.SQL.Add('    ,CAST(:celular AS VARCHAR(20)) AS celular ');
        FDQ_Append.SQL.Add('    ,CAST(:endereco AS VARCHAR(200)) AS endereco ');
        FDQ_Append.SQL.Add('    ,CAST(:email AS VARCHAR(100)) AS email ');
        FDQ_Append.SQL.Add(') SRC ON (f.id = SRC.id AND SRC.id > 0) ');
        FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
        FDQ_Append.SQL.Add('  UPDATE SET ');
        FDQ_Append.SQL.Add('    nome = SRC.nome ');
        FDQ_Append.SQL.Add('    ,telefone = SRC.telefone ');
        FDQ_Append.SQL.Add('    ,celular = SRC.celular ');
        FDQ_Append.SQL.Add('    ,endereco = SRC.endereco ');
        FDQ_Append.SQL.Add('    ,email = SRC.email ');
        FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
        FDQ_Append.SQL.Add('  INSERT (nome, telefone, celular, endereco, email, empresa_id, usuario_id) ');
        FDQ_Append.SQL.Add('  VALUES (SRC.nome, SRC.telefone, SRC.celular, SRC.endereco, SRC.email, :empresa_id, :usuario_id) ');
        FDQ_Append.SQL.Add('RETURNING f.id ');

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('nome').AsString := Trim(LObj.GetValue<String>('nome', ''));
        FDQ_Append.ParamByName('telefone').AsString := Trim(LObj.GetValue<String>('telefone', ''));
        FDQ_Append.ParamByName('celular').AsString := Trim(LObj.GetValue<String>('celular', ''));
        FDQ_Append.ParamByName('endereco').AsString := Trim(LObj.GetValue<String>('endereco', ''));
        FDQ_Append.ParamByName('email').AsString := Trim(LObj.GetValue<String>('email', ''));
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.ParamByName('usuario_id').AsInteger := aUsuarioId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Fornecedor inserido/atualizado com sucesso');
      Result.Menssage := 'Fornecedor Inserido/Atualizado com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      {
      on E: EBusinessException do
      begin
        if Assigned(fDm) and fDm.FDC_Firebird.InTransaction then
          fDm.FDC_Firebird.Rollback;
        Result.Id := E.Código;
        Result.Menssage := E.Descricao;
      end;
      }
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Fornecedor_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código do Fornecedor para excluir.';
        GravarLogJSON('uDataBase.Manager', 'Fornecedor_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from public.fornecedor where id = :Id and empresa_id = :empresa_id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Fornecedor ' + aId.ToString + ', excluído com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Fornecedor ' + aId.ToString + ' excluído com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500; // erro interno de banco
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400; // requisi��o inválida
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403; // acesso negado
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500; // fallback gen�rico
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Cliente_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      FDQ_Append.SQL.Add('MERGE INTO public.cliente c ');
      FDQ_Append.SQL.Add('USING ( ');
      FDQ_Append.SQL.Add('  SELECT ');
      FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
      FDQ_Append.SQL.Add('    ,CAST(:nome AS VARCHAR(100)) AS nome ');
      FDQ_Append.SQL.Add('    ,CAST(:telefone AS VARCHAR(20)) AS telefone ');
      FDQ_Append.SQL.Add('    ,CAST(:celular AS VARCHAR(20)) AS celular ');
      FDQ_Append.SQL.Add('    ,CAST(:endereco AS VARCHAR(200)) AS endereco ');
      FDQ_Append.SQL.Add('    ,CAST(:email AS VARCHAR(100)) AS email ');
      FDQ_Append.SQL.Add(') SRC ON (c.id = SRC.id AND SRC.id > 0) ');
      FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
      FDQ_Append.SQL.Add('  UPDATE SET ');
      FDQ_Append.SQL.Add('    nome = SRC.nome ');
      FDQ_Append.SQL.Add('    ,telefone = SRC.telefone ');
      FDQ_Append.SQL.Add('    ,celular = SRC.celular ');
      FDQ_Append.SQL.Add('    ,endereco = SRC.endereco ');
      FDQ_Append.SQL.Add('    ,email = SRC.email ');
        FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
        FDQ_Append.SQL.Add('  INSERT (nome, telefone, celular, endereco, email, empresa_id, usuario_id) ');
        FDQ_Append.SQL.Add('  VALUES (SRC.nome, SRC.telefone, SRC.celular, SRC.endereco, SRC.email, :empresa_id, :usuario_id) ');
        FDQ_Append.SQL.Add('RETURNING c.id ');

        fDm.FDConnection.StartTransaction;
        for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if Trim(LObj.GetValue<String>('nome','')) = '' then
        begin
          Result.Id := 404;
          Result.Menssage := 'Nome do Cliente não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('nome').AsString := Trim(LObj.GetValue<String>('nome', ''));
        FDQ_Append.ParamByName('telefone').AsString := Trim(LObj.GetValue<String>('telefone', ''));
        FDQ_Append.ParamByName('celular').AsString := Trim(LObj.GetValue<String>('celular', ''));
        FDQ_Append.ParamByName('endereco').AsString := Trim(LObj.GetValue<String>('endereco', ''));
        FDQ_Append.ParamByName('email').AsString := Trim(LObj.GetValue<String>('email', ''));
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.ParamByName('usuario_id').AsInteger := aUsuarioId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Cliente inserido/atualizado com sucesso');
      Result.Menssage := 'Cliente Inserido/Atualizado com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Cliente_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código do Cliente para excluir.';
        GravarLogJSON('uDataBase.Manager', 'Cliente_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from public.cliente where id = :Id and empresa_id = :empresa_id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Cliente ' + aId.ToString + ', excluído com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Cliente ' + aId.ToString + ' excluído com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Cliente_Listar(
  out fJson:TJSONArray;
  const aId: Integer = 0;
  const aNome: String = '';
  const aEmail: String = '';
  const APagina:Integer=0;
  const APaginas:Integer=0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  c.* ');
      FDQ_Select.Sql.Add('from public.cliente c ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and c.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if Trim(aNome) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(c.nome) like upper(:nome) ');
        FDQ_Select.ParamByName('nome').AsString := '%'+aNome+'%';
      end;
      if Trim(aEmail) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(c.email) = upper(:email) ');
        FDQ_Select.ParamByName('email').AsString := aEmail;
      end;
      FDQ_Select.Sql.Add('  and (c.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  c.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar os clientes.';
        GravarLogJSON('uDataBase.Manager', 'Cliente_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.CategoriaPagar_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      FDQ_Append.SQL.Add('MERGE INTO gestor.categoria_pagar c ');
      FDQ_Append.SQL.Add('USING ( ');
      FDQ_Append.SQL.Add('  SELECT ');
      FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
      FDQ_Append.SQL.Add('    ,CAST(:nome AS VARCHAR(100)) AS nome ');
      FDQ_Append.SQL.Add('    ,CAST(:descricao AS VARCHAR(255)) AS descricao ');
      FDQ_Append.SQL.Add('    ,CAST(:ativo AS BOOLEAN) AS ativo ');
      FDQ_Append.SQL.Add(') SRC ON (c.id = SRC.id AND SRC.id > 0) ');
      FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
      FDQ_Append.SQL.Add('  UPDATE SET ');
      FDQ_Append.SQL.Add('    nome = SRC.nome ');
      FDQ_Append.SQL.Add('    ,descricao = SRC.descricao ');
      FDQ_Append.SQL.Add('    ,ativo = SRC.ativo ');
      FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
      FDQ_Append.SQL.Add('  INSERT (nome, descricao, ativo, empresa_id, usuario_id) ');
      FDQ_Append.SQL.Add('  VALUES (SRC.nome, SRC.descricao, SRC.ativo, :empresa_id, :usuario_id) ');
      FDQ_Append.SQL.Add('RETURNING c.id ');

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if Trim(LObj.GetValue<String>('nome','')) = '' then
        begin
          Result.Id := 404;
          Result.Menssage := 'Nome do Serviço não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('nome').AsString := Trim(LObj.GetValue<String>('nome', ''));
        FDQ_Append.ParamByName('descricao').AsString := Trim(LObj.GetValue<String>('descricao', ''));
        FDQ_Append.ParamByName('ativo').AsBoolean := LObj.GetValue<Boolean>('ativo', True);
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.ParamByName('usuario_id').AsInteger := aUsuarioId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Categoria inserida/atualizada com sucesso');
      Result.Menssage := 'Categoria Inserida/Atualizada com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.CategoriaPagar_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código da Categoria para excluir.';
        GravarLogJSON('uDataBase.Manager', 'CategoriaPagar_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from gestor.categoria_pagar where id = :Id and empresa_id = :empresa_id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Categoria ' + aId.ToString + ', excluída com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Categoria ' + aId.ToString + ' excluída com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.CategoriaPagar_Listar(
  out fJson:TJSONArray;
  const aId: Integer = 0;
  const aNome: String = '';
  const APagina:Integer=0;
  const APaginas:Integer=0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  c.* ');
      FDQ_Select.Sql.Add('from gestor.categoria_pagar c ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and c.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if Trim(aNome) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(c.nome) like upper(:nome) ');
        FDQ_Select.ParamByName('nome').AsString := '%'+aNome+'%';
      end;
      FDQ_Select.Sql.Add('  and (c.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  c.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar as categorias.';
        GravarLogJSON('uDataBase.Manager', 'CategoriaPagar_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.CategoriaReceber_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      FDQ_Append.SQL.Add('MERGE INTO gestor.categoria_receber c ');
      FDQ_Append.SQL.Add('USING ( ');
      FDQ_Append.SQL.Add('  SELECT ');
      FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
      FDQ_Append.SQL.Add('    ,CAST(:nome AS VARCHAR(100)) AS nome ');
      FDQ_Append.SQL.Add('    ,CAST(:descricao AS VARCHAR(255)) AS descricao ');
      FDQ_Append.SQL.Add('    ,CAST(:ativo AS BOOLEAN) AS ativo ');
      FDQ_Append.SQL.Add(') SRC ON (c.id = SRC.id AND SRC.id > 0) ');
      FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
      FDQ_Append.SQL.Add('  UPDATE SET ');
      FDQ_Append.SQL.Add('    nome = SRC.nome ');
      FDQ_Append.SQL.Add('    ,descricao = SRC.descricao ');
      FDQ_Append.SQL.Add('    ,ativo = SRC.ativo ');
      FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
      FDQ_Append.SQL.Add('  INSERT (nome, descricao, ativo, empresa_id, usuario_id) ');
      FDQ_Append.SQL.Add('  VALUES (SRC.nome, SRC.descricao, SRC.ativo, :empresa_id, :usuario_id) ');
      FDQ_Append.SQL.Add('RETURNING c.id ');

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if Trim(LObj.GetValue<String>('nome','')) = '' then
        begin
          Result.Id := 404;
          Result.Menssage := 'Nome da Categoria não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('nome').AsString := Trim(LObj.GetValue<String>('nome', ''));
        FDQ_Append.ParamByName('descricao').AsString := Trim(LObj.GetValue<String>('descricao', ''));
        FDQ_Append.ParamByName('ativo').AsBoolean := LObj.GetValue<Boolean>('ativo', True);
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.ParamByName('usuario_id').AsInteger := aUsuarioId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Categoria Receber inserida/atualizada com sucesso');
      Result.Menssage := 'Categoria Receber Inserida/Atualizada com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.CategoriaReceber_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código da Categoria para excluir.';
        GravarLogJSON('uDataBase.Manager', 'CategoriaReceber_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from gestor.categoria_receber where id = :Id and empresa_id = :empresa_id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Categoria Receber ' + aId.ToString + ', excluída com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Categoria Receber ' + aId.ToString + ' excluída com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.CategoriaReceber_Listar(
  out fJson:TJSONArray;
  const aId: Integer = 0;
  const aNome: String = '';
  const APagina:Integer=0;
  const APaginas:Integer=0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  c.* ');
      FDQ_Select.Sql.Add('from gestor.categoria_receber c ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and c.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if Trim(aNome) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(c.nome) like upper(:nome) ');
        FDQ_Select.ParamByName('nome').AsString := '%'+aNome+'%';
      end;
      FDQ_Select.Sql.Add('  and (c.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  c.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar as categorias.';
        GravarLogJSON('uDataBase.Manager', 'CategoriaReceber_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.ContasPagar_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      FDQ_Append.SQL.Add('MERGE INTO gestor.contas_pagar cp ');
      FDQ_Append.SQL.Add('USING ( ');
      FDQ_Append.SQL.Add('  SELECT ');
      FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
      FDQ_Append.SQL.Add('    ,CAST(:usuario_id AS INTEGER) AS usuario_id ');
      FDQ_Append.SQL.Add('    ,CAST(:fornecedor_id AS INTEGER) AS fornecedor_id ');
      FDQ_Append.SQL.Add('    ,CAST(:descricao AS VARCHAR(200)) AS descricao ');
      FDQ_Append.SQL.Add('    ,CAST(:valor AS NUMERIC(12,2)) AS valor ');
      FDQ_Append.SQL.Add('    ,CAST(:data_vencimento AS DATE) AS data_vencimento ');
      FDQ_Append.SQL.Add('    ,CAST(:id_categoria AS INTEGER) AS id_categoria ');
      FDQ_Append.SQL.Add('    ,CAST(:pago AS BOOLEAN) AS pago ');
      FDQ_Append.SQL.Add('    ,CAST(:data_pagamento AS DATE) AS data_pagamento ');
      FDQ_Append.SQL.Add('    ,CAST(:lancamento_origem_id AS INTEGER) AS lancamento_origem_id ');
      FDQ_Append.SQL.Add(') SRC ON (cp.id = SRC.id AND SRC.id > 0) ');
      FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
      FDQ_Append.SQL.Add('  UPDATE SET ');
      FDQ_Append.SQL.Add('    usuario_id = SRC.usuario_id ');
      FDQ_Append.SQL.Add('    ,fornecedor_id = SRC.fornecedor_id ');
      FDQ_Append.SQL.Add('    ,descricao = SRC.descricao ');
      FDQ_Append.SQL.Add('    ,valor = SRC.valor ');
      FDQ_Append.SQL.Add('    ,data_vencimento = SRC.data_vencimento ');
      FDQ_Append.SQL.Add('    ,id_categoria = SRC.id_categoria ');
      FDQ_Append.SQL.Add('    ,pago = SRC.pago ');
      FDQ_Append.SQL.Add('    ,data_pagamento = SRC.data_pagamento ');
      FDQ_Append.SQL.Add('    ,lancamento_origem_id = SRC.lancamento_origem_id ');
      FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
      FDQ_Append.SQL.Add('  INSERT (usuario_id, fornecedor_id, descricao, valor, data_vencimento, id_categoria, pago, data_pagamento, lancamento_origem_id, empresa_id) ');
      FDQ_Append.SQL.Add('  VALUES (SRC.usuario_id, SRC.fornecedor_id, SRC.descricao, SRC.valor, SRC.data_vencimento, SRC.id_categoria, SRC.pago, SRC.data_pagamento, SRC.lancamento_origem_id, :empresa_id) ');
      FDQ_Append.SQL.Add('RETURNING cp.id ');

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        GravarLogJSON('uDataBase.Manager', 'ContasPagar_Atualizar JSON recebido: ' + LObj.ToString, 'ContasPagar_Atualizar', nil);
        
        // List all keys in LObj to debug
        var SB := TStringBuilder.Create;
        try
          SB.Append('Chaves no JSON: ');
          for var J := 0 to LObj.Count -1 do
          begin
            SB.Append(LObj.Pairs[J].JsonString.Value + ', ');
          end;
          GravarLogJSON('uDataBase.Manager', SB.ToString, 'ContasPagar_Atualizar', nil);
        finally
          SB.Free;
        end;

        if Trim(LObj.GetValue<String>('descricao','')) = '' then
        begin
          Result.Id := 404;
          Result.Menssage := 'Descri��o da Conta não informada.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        if LObj.GetValue<Double>('valor', 0) <= 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Valor da Conta não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        if LObj.GetValue<TDateTime>('dataVencimento', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Data de Vencimento da Conta não informada.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('usuario_id').AsInteger := aUsuarioId;
        FDQ_Append.ParamByName('fornecedor_id').AsInteger := LObj.GetValue<Integer>('fornecedorId', 0);
        FDQ_Append.ParamByName('descricao').AsString := Trim(LObj.GetValue<String>('descricao', ''));
        FDQ_Append.ParamByName('valor').AsFloat := LObj.GetValue<Double>('valor', 0);
        FDQ_Append.ParamByName('data_vencimento').AsDate := LObj.GetValue<TDateTime>('dataVencimento', 0);
        FDQ_Append.ParamByName('id_categoria').AsInteger := LObj.GetValue<Integer>('idCategoria', 0);
    FDQ_Append.ParamByName('pago').AsBoolean := LObj.GetValue<Boolean>('pago', False);
    FDQ_Append.ParamByName('data_pagamento').DataType := ftDate; // Set data type explicitly!
    FDQ_Append.ParamByName('data_pagamento').Clear; // Always clear, since we don't use this field on update/insert
    FDQ_Append.ParamByName('lancamento_origem_id').AsInteger := LObj.GetValue<Integer>('lancamento_origem_id', 0);
    FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;

        // Log SQL and parameters
        GravarLogJSON('uDataBase.Manager', 'SQL: ' + FDQ_Append.SQL.Text, 'ContasPagar_Atualizar', nil);
        var ParamsLog := TStringBuilder.Create;
        try
          ParamsLog.Append('Parâmetros: ');
          for var K := 0 to FDQ_Append.Params.Count - 1 do
          begin
            var P := FDQ_Append.Params[K];
            if P.IsNull then
              ParamsLog.AppendFormat('%s=NULL, ', [P.Name])
            else
              ParamsLog.AppendFormat('%s=%s, ', [P.Name, VarToStr(P.Value)]);
          end;
          GravarLogJSON('uDataBase.Manager', ParamsLog.ToString, 'ContasPagar_Atualizar', nil);
        finally
          ParamsLog.Free;
        end;

        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Conta a Pagar inserida/atualizada com sucesso');
      Result.Menssage := 'Conta a Pagar Inserida/Atualizada com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.ContasPagar_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código da Conta a Pagar para excluir.';
        GravarLogJSON('uDataBase.Manager', 'ContasPagar_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from gestor.contas_pagar where id = :Id and empresa_id = :empresa_id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Conta a Pagar ' + aId.ToString + ', excluída com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Conta a Pagar ' + aId.ToString + ' excluída com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.ContasPagar_Listar(
  out fJson:TJSONArray;
  const aId: Integer = 0;
  const aFornecedorId: Integer = 0;
  const aDescricao: String = '';
  const aDataInicial: TDateTime = 0;
  const aDataFinal: TDateTime = 0;
  const aPago: Integer = -1;
  const APagina:Integer=0;
  const APaginas:Integer=0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  cp.* ');
      FDQ_Select.Sql.Add('  ,f.nome as fornecedor_nome ');
      FDQ_Select.Sql.Add('  ,f.telefone as fornecedor_telefone ');
      FDQ_Select.Sql.Add('  ,f.email as fornecedor_email ');
      FDQ_Select.Sql.Add('  ,cp2.nome as categoria_nome ');
      FDQ_Select.Sql.Add('  ,u.nome as usuario_nome ');
      FDQ_Select.Sql.Add('from gestor.contas_pagar cp ');
      FDQ_Select.Sql.Add('left join public.fornecedor f on f.id = cp.fornecedor_id ');
      FDQ_Select.Sql.Add('left join gestor.categoria_pagar cp2 on cp2.id = cp.id_categoria ');
      FDQ_Select.Sql.Add('left join public.usuario u on u.id = cp.usuario_id ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and cp.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if aFornecedorId > 0 then
      begin
        FDQ_Select.Sql.Add('  and cp.fornecedor_id = :fornecedor_id ');
        FDQ_Select.ParamByName('fornecedor_id').AsInteger := aFornecedorId;
      end;
      if Trim(aDescricao) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(cp.descricao) like upper(:descricao) ');
        FDQ_Select.ParamByName('descricao').AsString := '%'+aDescricao+'%';
      end;
      if aDataInicial > 0 then
      begin
        FDQ_Select.Sql.Add('  and cp.data_vencimento >= :data_inicial ');
        FDQ_Select.ParamByName('data_inicial').AsDateTime := aDataInicial;
      end;
      if aDataFinal > 0 then
      begin
        FDQ_Select.Sql.Add('  and cp.data_vencimento <= :data_final ');
        FDQ_Select.ParamByName('data_final').AsDateTime := aDataFinal;
      end;
      if aPago >= 0 then
      begin
        FDQ_Select.Sql.Add('  and cp.pago = :p_pago ');
        FDQ_Select.ParamByName('p_pago').AsBoolean := (aPago = 1);
      end;
      FDQ_Select.Sql.Add('  and (cp.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  cp.data_vencimento ASC, cp.id ASC; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar as contas a pagar.';
        GravarLogJSON('uDataBase.Manager', 'ContasPagar_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.ContasPagar_Pagar(const aId: Integer; const aDataPagamento: TDateTime; const aEmpresaId: Integer = 0; const aValorBaixa: Double = 0; const aDesconto: Double = 0; const aAcrescimo: Double = 0): TReturn;
var
  fDm: TDM;
  FDQ_Update: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Update := nil;
  fDm := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Update := TFDQuery.Create(nil);
      FDQ_Update.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId <= 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'Código da Conta a Pagar não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Update.Close;
      FDQ_Update.Sql.Clear;
      FDQ_Update.Sql.Add('UPDATE gestor.contas_pagar SET ');
      FDQ_Update.Sql.Add('  pago = true,');
      FDQ_Update.Sql.Add('  data_pagamento = :data_pagamento');
      if aValorBaixa > 0 then
      begin
        FDQ_Update.Sql.Add('  , valor_baixa = :valor_baixa');
        FDQ_Update.ParamByName('valor_baixa').AsFloat := aValorBaixa;
      end;
      if aDesconto > 0 then
      begin
        FDQ_Update.Sql.Add('  , desconto = :desconto');
        FDQ_Update.ParamByName('desconto').AsFloat := aDesconto;
      end;
      if aAcrescimo > 0 then
      begin
        FDQ_Update.Sql.Add('  , acrescimo = :acrescimo');
        FDQ_Update.ParamByName('acrescimo').AsFloat := aAcrescimo;
      end;
      FDQ_Update.Sql.Add('WHERE id = :id and empresa_id = :empresa_id ');

      FDQ_Update.ParamByName('id').AsInteger := aId;
      FDQ_Update.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Update.ParamByName('data_pagamento').DataType := ftDate;
      if aDataPagamento > 0 then
        FDQ_Update.ParamByName('data_pagamento').AsDate := aDataPagamento
      else
        FDQ_Update.ParamByName('data_pagamento').Clear;

      FDQ_Update.ExecSQL;

      if FDQ_Update.RowsAffected = 0 then
      begin
        fDm.FDConnection.Rollback;
        Result.Id := 404;
        Result.Menssage := 'Conta a Pagar não localizada.';
        Exit;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('mensagem', 'Pagamento registrado com sucesso');
      Result.Menssage := 'Pagamento registrado com sucesso.';

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Update) then
      FDQ_Update.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.ContasReceber_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      FDQ_Append.SQL.Add('MERGE INTO gestor.contas_receber cr ');
      FDQ_Append.SQL.Add('USING ( ');
      FDQ_Append.SQL.Add('  SELECT ');
      FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
      FDQ_Append.SQL.Add('    ,CAST(:usuario_id AS INTEGER) AS usuario_id ');
      FDQ_Append.SQL.Add('    ,CAST(:cliente_id AS INTEGER) AS cliente_id ');
      FDQ_Append.SQL.Add('    ,CAST(:descricao AS VARCHAR(200)) AS descricao ');
      FDQ_Append.SQL.Add('    ,CAST(:valor AS NUMERIC(12,2)) AS valor ');
      FDQ_Append.SQL.Add('    ,CAST(:data_vencimento AS DATE) AS data_vencimento ');
      FDQ_Append.SQL.Add('    ,CAST(:id_categoria AS INTEGER) AS id_categoria ');
      FDQ_Append.SQL.Add('    ,CAST(:recebido AS BOOLEAN) AS recebido ');
      FDQ_Append.SQL.Add('    ,CAST(:data_recebimento AS DATE) AS data_recebimento ');
      FDQ_Append.SQL.Add('    ,CAST(:lancamento_origem_id AS INTEGER) AS lancamento_origem_id ');
      FDQ_Append.SQL.Add('    ,CAST(:lancamento_origem AS INTEGER) AS lancamento_origem ');
      FDQ_Append.SQL.Add(') SRC ON (cr.id = SRC.id AND SRC.id > 0) ');
      FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
      FDQ_Append.SQL.Add('  UPDATE SET ');
      FDQ_Append.SQL.Add('    usuario_id = SRC.usuario_id ');
      FDQ_Append.SQL.Add('    ,cliente_id = SRC.cliente_id ');
      FDQ_Append.SQL.Add('    ,descricao = SRC.descricao ');
      FDQ_Append.SQL.Add('    ,valor = SRC.valor ');
      FDQ_Append.SQL.Add('    ,data_vencimento = SRC.data_vencimento ');
      FDQ_Append.SQL.Add('    ,id_categoria = SRC.id_categoria ');
      FDQ_Append.SQL.Add('    ,recebido = SRC.recebido ');
      FDQ_Append.SQL.Add('    ,data_recebimento = SRC.data_recebimento ');
      FDQ_Append.SQL.Add('    ,lancamento_origem_id = SRC.lancamento_origem_id ');
      FDQ_Append.SQL.Add('    ,lancamento_origem = SRC.lancamento_origem ');
      FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
      FDQ_Append.SQL.Add('  INSERT (usuario_id, cliente_id, descricao, valor, data_vencimento, id_categoria, recebido, data_recebimento, lancamento_origem_id, empresa_id,lancamento_origem) ');
      FDQ_Append.SQL.Add('  VALUES (SRC.usuario_id, SRC.cliente_id, SRC.descricao, SRC.valor, SRC.data_vencimento, SRC.id_categoria, SRC.recebido, SRC.data_recebimento, SRC.lancamento_origem_id, :empresa_id, SRC.lancamento_origem) ');
      FDQ_Append.SQL.Add('RETURNING cr.id ');

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if Trim(LObj.GetValue<String>('descricao','')) = '' then
        begin
          Result.Id := 404;
          Result.Menssage := 'Descri��o da Conta não informada.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        if LObj.GetValue<Double>('valor', 0) <= 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Valor da Conta não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        if LObj.GetValue<TDateTime>('data_vencimento', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Data de Vencimento da Conta não informada.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('usuario_id').AsInteger := aUsuarioId;
        FDQ_Append.ParamByName('cliente_id').AsInteger := LObj.GetValue<Integer>('cliente_id', 0);
        FDQ_Append.ParamByName('descricao').AsString := Trim(LObj.GetValue<String>('descricao', ''));
        FDQ_Append.ParamByName('valor').AsFloat := LObj.GetValue<Double>('valor', 0);
        FDQ_Append.ParamByName('data_vencimento').AsDate := LObj.GetValue<TDateTime>('data_vencimento', 0);
        FDQ_Append.ParamByName('id_categoria').AsInteger := LObj.GetValue<Integer>('id_categoria', 0);
        FDQ_Append.ParamByName('recebido').AsBoolean := LObj.GetValue<Boolean>('recebido', False);
        FDQ_Append.ParamByName('data_recebimento').DataType := ftDate; // Set data type explicitly!
        FDQ_Append.ParamByName('data_recebimento').Clear; // Always clear, since we don't use this field on update/insert
        FDQ_Append.ParamByName('lancamento_origem_id').AsInteger := LObj.GetValue<Integer>('lancamento_origem_id', 0);
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.ParamByName('lancamento_origem').AsInteger := LObj.GetValue<Integer>('lancamento_origem', 0);

        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Conta a Receber inserida/atualizada com sucesso');
      Result.Menssage := 'Conta a Receber Inserida/Atualizada com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.ContasReceber_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código da Conta a Receber para excluir.';
        GravarLogJSON('uDataBase.Manager', 'ContasReceber_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from gestor.contas_receber where id = :Id and empresa_id = :empresa_id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Conta a Receber ' + aId.ToString + ', excluída com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Conta a Receber ' + aId.ToString + ' excluída com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.ContasReceber_Listar(
  out fJson:TJSONArray;
  const aId: Integer = 0;
  const aClienteId: Integer = 0;
  const aDescricao: String = '';
  const aDataInicial: TDateTime = 0;
  const aDataFinal: TDateTime = 0;
  const aRecebido: Integer = -1;
  const APagina:Integer=0;
  const APaginas:Integer=0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  cr.* ');
      FDQ_Select.Sql.Add('  ,cl.nome as cliente_nome ');
      FDQ_Select.Sql.Add('  ,cl.telefone as cliente_telefone ');
      FDQ_Select.Sql.Add('  ,cl.email as cliente_email ');
      FDQ_Select.Sql.Add('  ,cr2.nome as categoria_nome ');
      FDQ_Select.Sql.Add('  ,u.nome as usuario_nome ');
      FDQ_Select.Sql.Add('from gestor.contas_receber cr ');
      FDQ_Select.Sql.Add('left join public.cliente cl on cl.id = cr.cliente_id ');
      FDQ_Select.Sql.Add('left join gestor.categoria_receber cr2 on cr2.id = cr.id_categoria ');
      FDQ_Select.Sql.Add('left join public.usuario u on u.id = cr.usuario_id ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and cr.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if aClienteId > 0 then
      begin
        FDQ_Select.Sql.Add('  and cr.cliente_id = :cliente_id ');
        FDQ_Select.ParamByName('cliente_id').AsInteger := aClienteId;
      end;
      if Trim(aDescricao) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(cr.descricao) like upper(:descricao) ');
        FDQ_Select.ParamByName('descricao').AsString := '%'+aDescricao+'%';
      end;
      if aDataInicial > 0 then
      begin
        FDQ_Select.Sql.Add('  and cr.data_vencimento >= :data_inicial ');
        FDQ_Select.ParamByName('data_inicial').AsDateTime := aDataInicial;
      end;
      if aDataFinal > 0 then
      begin
        FDQ_Select.Sql.Add('  and cr.data_vencimento <= :data_final ');
        FDQ_Select.ParamByName('data_final').AsDateTime := aDataFinal;
      end;
      if aRecebido >= 0 then
      begin
        FDQ_Select.Sql.Add('  and cr.recebido = :p_recebido ');
        FDQ_Select.ParamByName('p_recebido').AsBoolean := (aRecebido = 1);
      end;
      FDQ_Select.Sql.Add('  and (cr.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  cr.data_vencimento ASC, cr.id ASC; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar as contas a receber.';
        GravarLogJSON('uDataBase.Manager', 'ContasReceber_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.ContasReceber_Receber(const aId: Integer; const aDataRecebimento: TDateTime; const aEmpresaId: Integer = 0; const aValorBaixa: Double = 0; const aDesconto: Double = 0; const aAcrescimo: Double = 0): TReturn;
var
  fDm: TDM;
  FDQ_Update: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Update := nil;
  fDm := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Update := TFDQuery.Create(nil);
      FDQ_Update.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId <= 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'Código da Conta a Receber não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Update.Close;
      FDQ_Update.Sql.Clear;
      FDQ_Update.Sql.Add('UPDATE gestor.contas_receber SET ');
      FDQ_Update.Sql.Add('  recebido = true,');
      FDQ_Update.Sql.Add('  data_recebimento = :data_recebimento');
      if aValorBaixa > 0 then
      begin
        FDQ_Update.Sql.Add('  , valor_baixa = :valor_baixa');
        FDQ_Update.ParamByName('valor_baixa').AsFloat := aValorBaixa;
      end;
      if aDesconto > 0 then
      begin
        FDQ_Update.Sql.Add('  , desconto = :desconto');
        FDQ_Update.ParamByName('desconto').AsFloat := aDesconto;
      end;
      if aAcrescimo > 0 then
      begin
        FDQ_Update.Sql.Add('  , acrescimo = :acrescimo');
        FDQ_Update.ParamByName('acrescimo').AsFloat := aAcrescimo;
      end;
      FDQ_Update.Sql.Add('WHERE id = :id and empresa_id = :empresa_id ');

      FDQ_Update.ParamByName('id').AsInteger := aId;
      FDQ_Update.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Update.ParamByName('data_recebimento').DataType := ftDate;
      if aDataRecebimento > 0 then
        FDQ_Update.ParamByName('data_recebimento').AsDate := aDataRecebimento
      else
        FDQ_Update.ParamByName('data_recebimento').Clear;

      FDQ_Update.ExecSQL;

      if FDQ_Update.RowsAffected = 0 then
      begin
        fDm.FDConnection.Rollback;
        Result.Id := 404;
        Result.Menssage := 'Conta a Receber não localizada.';
        Exit;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('mensagem', 'Recebimento registrado com sucesso');
      Result.Menssage := 'Recebimento registrado com sucesso.';

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Update) then
      FDQ_Update.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Fornecedor_Listar(
  out fJson:TJSONArray;
  const aId: Integer = 0;
  const aNome: String = '';
  const aEmail: String = '';
  const APagina:Integer=0;
  const APaginas:Integer=0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  f.* ');
      FDQ_Select.Sql.Add('from public.fornecedor f ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and f.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if Trim(aNome) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(f.nome) like upper(:nome) ');
        FDQ_Select.ParamByName('nome').AsString := '%'+aNome+'%';
      end;
      if Trim(aEmail) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(f.email) = upper(:email) ');
        FDQ_Select.ParamByName('email').AsString := aEmail;
      end;
      FDQ_Select.Sql.Add('  and (f.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  f.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar os fornecedores.';
        GravarLogJSON('uDataBase.Manager', 'Fornecedor_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
        //GravarLogJSON('uDataBase.Manager', 'Coleta_Listagem', 'uDataBase.Manager', Exception.Create('Solicita��o conclu�da: Coleta dispon�veis'));
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500; // erro interno de banco
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400; // requisi��o inválida
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403; // acesso negado
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500; // fallback gen�rico
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Login(const aPin, ALogin, ASenha: String; const aFilial: Integer; out fJson: TJSONObject;
  out FCod_Usuario: Integer): TReturn;
var
  fDm :TDm;
  fQuery: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fQuery := nil;
  fDm := nil;

  try
    try
      fDm := TDM.Create(nil);
      if not fDm.ConectarBanco then
        raise Exception.Create('Banco de dados não conectado');

      fQuery := TFDQuery.Create(nil);
      fQuery.Connection := fDm.FDConnection;

      if APin <> '' then
      begin
        // Login por PIN (não valida senha)
        fQuery.SQL.Text := 'SELECT id, nome, email FROM public.usuario WHERE pin = :pin';
        fQuery.ParamByName('pin').AsString := APin;
        fQuery.Open;
        if not fQuery.IsEmpty then
        begin
          FCod_Usuario := fQuery.FieldByName('id').AsInteger;
          fJson := fQuery.ToJSONObject;
          fJson.AddPair('usuario', fQuery.FieldByName('NOME').AsString);
          Result.Id := 200;
          Result.JSonObject := fJson;
          GravarLogJSON('uDataBase.Manager', 'Login', 'uDataBase.Manager', Exception.Create('Usuário: ' + fQuery.FieldByName('NOME').AsString));
        end
        else
        begin
          Result.Id := 404;
          Result.Menssage := 'Usuário não localizado.';
          GravarLogJSON('uDataBase.Manager', 'Login', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        end;
      end
      else
      begin
        // Login por Nome ou Email + Senha
        fQuery.SQL.Text :=
          'SELECT id, nome, email, senha FROM public.usuario ' +
          'WHERE (nome = :login OR email = :login)';
        fQuery.ParamByName('login').AsString := ALogin;
        fQuery.Open;

        if fQuery.IsEmpty then
        begin
          Result.Id := 404;
          Result.Menssage := 'Usuário não localizado.';
          GravarLogJSON('uDataBase.Manager', 'Login', 'uDataBase.Manager', Exception.Create(Result.Menssage));
          Exit;
        end;

        var lSenha := fQuery.FieldByName('senha').AsString;

        if Trim(lSenha) = '' then
        begin
          Result.Id := 401;
          Result.Menssage := 'Senha não configurada para este usuário.';
          GravarLogJSON('uDataBase.Manager', 'Login', 'uDataBase.Manager', Exception.Create(Result.Menssage));
          Exit;
        end;

        if not Validar(ASenha, lSenha) then
        begin
          Result.Id := 401;
          Result.Menssage := 'Senha inválida.';
          GravarLogJSON('uDataBase.Manager', 'Login', 'uDataBase.Manager', Exception.Create(Result.Menssage));
          Exit;
        end;

        FCod_Usuario := fQuery.FieldByName('id').AsInteger;
        fJson := fQuery.ToJSONObject;
        fJson.AddPair('usuario', fQuery.FieldByName('NOME').AsString);
        Result.Id := 200;
        Result.JSonObject := fJson;
        GravarLogJSON('uDataBase.Manager', 'Login', 'uDataBase.Manager', Exception.Create('Usuário: ' + fQuery.FieldByName('NOME').AsString));
      end;

    except
      on E: EDatabaseError do
      begin
        Result.Id := 500; // erro interno de banco
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400; // requisi??o inv?lida
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403; // acesso negado
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500; // fallback gen?rico
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    fQuery.Free;
  end;
end;

function TDataBaseManager.ContasPagar_Estornar(const aId: Integer; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Update: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Update := nil;
  fDm := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Update := TFDQuery.Create(nil);
      FDQ_Update.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId <= 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'Código da Conta a Pagar não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Update.Close;
      FDQ_Update.Sql.Clear;
      FDQ_Update.Sql.Add('UPDATE gestor.contas_pagar SET ');
      FDQ_Update.Sql.Add('  pago = false, ');
      FDQ_Update.Sql.Add('  data_pagamento = null ');
      FDQ_Update.Sql.Add('WHERE id = :id and empresa_id = :empresa_id ');

      FDQ_Update.ParamByName('id').AsInteger := aId;
      FDQ_Update.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Update.ExecSQL;

      if FDQ_Update.RowsAffected = 0 then
      begin
        fDm.FDConnection.Rollback;
        Result.Id := 404;
        Result.Menssage := 'Conta a Pagar não localizada.';
        Exit;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('mensagem', 'Estorno de pagamento realizado com sucesso');
      Result.Menssage := 'Estorno de pagamento realizado com sucesso.';

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Update) then
      FDQ_Update.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.ContasReceber_Estornar(const aId: Integer; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Update: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Update := nil;
  fDm := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Update := TFDQuery.Create(nil);
      FDQ_Update.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId <= 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'Código da Conta a Receber não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Update.Close;
      FDQ_Update.Sql.Clear;
      FDQ_Update.Sql.Add('UPDATE gestor.contas_receber SET ');
      FDQ_Update.Sql.Add('  recebido = false, ');
      FDQ_Update.Sql.Add('  data_recebimento = null ');
      FDQ_Update.Sql.Add('WHERE id = :id and empresa_id = :empresa_id ');

      FDQ_Update.ParamByName('id').AsInteger := aId;
      FDQ_Update.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Update.ExecSQL;

      if FDQ_Update.RowsAffected = 0 then
      begin
        fDm.FDConnection.Rollback;
        Result.Id := 404;
        Result.Menssage := 'Conta a Receber não localizada.';
        Exit;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('mensagem', 'Estorno de recebimento realizado com sucesso');
      Result.Menssage := 'Estorno de recebimento realizado com sucesso.';

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Update) then
      FDQ_Update.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Dashboard_Listar(out fJson: TJSONObject; const aDataInicial, aDataFinal: TDateTime; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Total: TFDQuery;
  FDQ_Mensal: TFDQuery;
  fTotalReceber, fTotalPagar: Double;
  fArrayMensal: TJSONArray;
  fMesIni, fMesFim: TDateTime;
  fY, fM, fD: Word;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Total := nil;
  FDQ_Mensal := nil;
  fJson := nil;

  try
    try
      fDm := TDM.Create(nil);
      if not fDm.ConectarBanco then
        raise Exception.Create('Banco de dados não conectado');

      // �ltimos 6 meses completos
      DecodeDate(Date, fY, fM, fD);
      fMesIni := IncMonth(EncodeDate(fY, fM, 1), -5);
      fMesFim := EncodeDate(fY, fM, 1);
      fMesFim := IncMonth(fMesFim, 1) - 1;

      // Totais do per�odo do filtro
      FDQ_Total := TFDQuery.Create(nil);
      FDQ_Total.Connection := fDm.FDConnection;

      FDQ_Total.SQL.Text :=
        'SELECT ' +
        '  COALESCE((SELECT SUM(valor) FROM gestor.contas_receber WHERE data_vencimento BETWEEN :dtini AND :dtfim AND (empresa_id = :empresa_id OR :empresa_id = 0)), 0) AS total_receber, ' +
        '  COALESCE((SELECT SUM(valor) FROM gestor.contas_pagar  WHERE data_vencimento BETWEEN :dtini AND :dtfim AND (empresa_id = :empresa_id OR :empresa_id = 0)), 0) AS total_pagar';
      FDQ_Total.ParamByName('dtini').AsDateTime := aDataInicial;
      FDQ_Total.ParamByName('dtfim').AsDateTime := aDataFinal;
      FDQ_Total.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Total.Open;

      fTotalReceber := FDQ_Total.FieldByName('total_receber').AsFloat;
      fTotalPagar := FDQ_Total.FieldByName('total_pagar').AsFloat;

      // Mensal - �ltimos 6 meses
      FDQ_Mensal := TFDQuery.Create(nil);
      FDQ_Mensal.Connection := fDm.FDConnection;
      FDQ_Mensal.SQL.Text :=
        'SELECT mes_texto, SUM(total_receber) AS total_receber, SUM(total_pagar) AS total_pagar ' +
        'FROM ( ' +
        '  SELECT TO_CHAR(data_vencimento, ''YYYY-MM'') AS mes_texto, ' +
        '         SUM(valor) AS total_receber, 0 AS total_pagar ' +
        '  FROM gestor.contas_receber ' +
        '  WHERE data_vencimento BETWEEN :dtini_m AND :dtfim_m AND (empresa_id = :empresa_id_m OR :empresa_id_m = 0) ' +
        '  GROUP BY TO_CHAR(data_vencimento, ''YYYY-MM'') ' +
        '  UNION ALL ' +
        '  SELECT TO_CHAR(data_vencimento, ''YYYY-MM'') AS mes_texto, ' +
        '         0 AS total_receber, SUM(valor) AS total_pagar ' +
        '  FROM gestor.contas_pagar ' +
        '  WHERE data_vencimento BETWEEN :dtini_m AND :dtfim_m AND (empresa_id = :empresa_id_m OR :empresa_id_m = 0) ' +
        '  GROUP BY TO_CHAR(data_vencimento, ''YYYY-MM'') ' +
        ') sub ' +
        'GROUP BY mes_texto ' +
        'ORDER BY mes_texto';
      FDQ_Mensal.ParamByName('dtini_m').AsDateTime := fMesIni;
      FDQ_Mensal.ParamByName('dtfim_m').AsDateTime := fMesFim;
      FDQ_Mensal.ParamByName('empresa_id_m').AsInteger := aEmpresaId;
      FDQ_Mensal.Open;

      fArrayMensal := FDQ_Mensal.ToJSONArray;

      fJson := TJSONObject.Create;
      fJson.AddPair('total_receber', TJSONNumber.Create(fTotalReceber));
      fJson.AddPair('total_pagar', TJSONNumber.Create(fTotalPagar));
      fJson.AddPair('mensal', fArrayMensal);

      Result.Id := 200;
      Result.JSonObject := fJson;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Total) then
      FDQ_Total.Free;
    if Assigned(FDQ_Mensal) then
      FDQ_Mensal.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Usuario_Listar(
  out fJson:TJSONArray;
  const aId: Integer = 0;
  const aNome: String = '';
  const aEmail: String = '';
  const APagina:Integer=0;
  const APaginas:Integer=0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  u.id, u.nome, u.email, u.pin ');
      FDQ_Select.Sql.Add('from public.usuario u ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and u.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if Trim(aNome) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(u.nome) like upper(:nome) ');
        FDQ_Select.ParamByName('nome').AsString := '%'+aNome+'%';
      end;
      if Trim(aEmail) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(u.email) = upper(:email) ');
        FDQ_Select.ParamByName('email').AsString := aEmail;
      end;
      if aEmpresaId > 0 then
      begin
        FDQ_Select.Sql.Add('  and (u.id in (select ue.usuario_id from public.usuario_empresa ue where ue.empresa_id = :usr_empresa_id) ');
        FDQ_Select.Sql.Add('    or not exists (select 1 from public.usuario_empresa ue2 where ue2.usuario_id = u.id)) ');
        FDQ_Select.ParamByName('usr_empresa_id').AsInteger := aEmpresaId;
      end;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  u.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar os usuários.';
        GravarLogJSON('uDataBase.Manager', 'Usuario_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Usuario_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      FDQ_Append.SQL.Add('MERGE INTO public.usuario u ');
      FDQ_Append.SQL.Add('USING ( ');
      FDQ_Append.SQL.Add('  SELECT ');
      FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
      FDQ_Append.SQL.Add('    ,CAST(:nome AS VARCHAR(100)) AS nome ');
      FDQ_Append.SQL.Add('    ,CAST(:email AS VARCHAR(100)) AS email ');
      FDQ_Append.SQL.Add(') SRC ON (u.id = SRC.id AND SRC.id > 0) ');
      FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
      FDQ_Append.SQL.Add('  UPDATE SET ');
      FDQ_Append.SQL.Add('    nome = SRC.nome ');
      FDQ_Append.SQL.Add('    ,email = SRC.email ');
      FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
      FDQ_Append.SQL.Add('  INSERT (nome, email, empresa_id) ');
      FDQ_Append.SQL.Add('  VALUES (SRC.nome, SRC.email, :empresa_id) ');
      FDQ_Append.SQL.Add('RETURNING u.id ');

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if Trim(LObj.GetValue<String>('nome','')) = '' then
        begin
          Result.Id := 404;
          Result.Menssage := 'Nome do Usuário não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('nome').AsString := Trim(LObj.GetValue<String>('nome', ''));
        FDQ_Append.ParamByName('email').AsString := Trim(LObj.GetValue<String>('email', ''));
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Usuário inserido/atualizado com sucesso');
      Result.Menssage := 'Usuário Inserido/Atualizado com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Usuario_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código do Usuário para excluir.';
        GravarLogJSON('uDataBase.Manager', 'Usuario_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from public.usuario where id = :Id and empresa_id = :empresa_id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Usuário ' + aId.ToString + ', excluído com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Usuário ' + aId.ToString + ' excluído com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Usuario_AlterarSenha(const aId: Integer; const aSenhaAtual, aNovaSenha: String; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Update: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Update := nil;
  fDm := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Update := TFDQuery.Create(nil);
      FDQ_Update.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId <= 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'Código do Usuário não informado.';
        Exit;
      end;

      if aNovaSenha = '' then
      begin
        Result.Id := 400;
        Result.Menssage := 'Nova senha não informada.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Update.Close;
      FDQ_Update.Sql.Clear;
      FDQ_Update.Sql.Add('UPDATE public.usuario SET ');
      FDQ_Update.Sql.Add('  senha = :nova_senha ');
      FDQ_Update.Sql.Add('WHERE id = :id and empresa_id = :empresa_id ');

      if aSenhaAtual <> '' then
      begin
        FDQ_Update.Sql.Add('  AND senha = :senha_atual ');
        FDQ_Update.ParamByName('senha_atual').AsString := Trim(Criptografar(aSenhaAtual));
      end;

      FDQ_Update.ParamByName('id').AsInteger := aId;
      FDQ_Update.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Update.ParamByName('nova_senha').AsString := Trim(Criptografar(aNovaSenha));
      FDQ_Update.ExecSQL;

      if FDQ_Update.RowsAffected = 0 then
      begin
        fDm.FDConnection.Rollback;
        Result.Id := 404;
        if aSenhaAtual <> '' then
          Result.Menssage := 'Usuário não localizado ou senha atual incorreta.'
        else
          Result.Menssage := 'Usuário não localizado.';
        Exit;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('mensagem', 'Senha alterada com sucesso');
      Result.Menssage := 'Senha alterada com sucesso.';

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Update) then
      FDQ_Update.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Usuario_AlterarPin(const aId: Integer; const aNovoPin: String; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Update: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Update := nil;
  fDm := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Update := TFDQuery.Create(nil);
      FDQ_Update.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId <= 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'Código do Usuário não informado.';
        Exit;
      end;

      if aNovoPin = '' then
      begin
        Result.Id := 400;
        Result.Menssage := 'Novo PIN não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Update.Close;
      FDQ_Update.Sql.Clear;
      FDQ_Update.Sql.Add('UPDATE public.usuario SET ');
      FDQ_Update.Sql.Add('  pin = :novo_pin ');
      FDQ_Update.Sql.Add('WHERE id = :id and empresa_id = :empresa_id ');

      FDQ_Update.ParamByName('id').AsInteger := aId;
      FDQ_Update.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Update.ParamByName('novo_pin').AsString := aNovoPin;
      FDQ_Update.ExecSQL;

      if FDQ_Update.RowsAffected = 0 then
      begin
        fDm.FDConnection.Rollback;
        Result.Id := 404;
        Result.Menssage := 'Usuário não localizado.';
        Exit;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('mensagem', 'PIN alterado com sucesso');
      Result.Menssage := 'PIN alterado com sucesso.';

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Update) then
      FDQ_Update.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Serviço }

function TDataBaseManager.Servico_Listar(
  out fJson:TJSONArray;
  const aId: Integer = 0;
  const aNome: String = '';
  const APagina:Integer=0;
  const APaginas:Integer=0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  s.id, s.nome, s.valor_hora, ');
      FDQ_Select.Sql.Add('  CAST(s.horas_minimas AS TEXT) AS horas_minimas ');
      FDQ_Select.Sql.Add('from servicos.servico s ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and s.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if Trim(aNome) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(s.nome) like upper(:nome) ');
        FDQ_Select.ParamByName('nome').AsString := '%'+aNome+'%';
      end;
      FDQ_Select.Sql.Add('  and (s.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  s.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar os serviços.';
        GravarLogJSON('uDataBase.Manager', 'Servico_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Servico_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      FDQ_Append.SQL.Add('MERGE INTO servicos.servico s ');
      FDQ_Append.SQL.Add('USING ( ');
      FDQ_Append.SQL.Add('  SELECT ');
      FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
      FDQ_Append.SQL.Add('    ,CAST(:nome AS VARCHAR(100)) AS nome ');
      FDQ_Append.SQL.Add('    ,CAST(:horas_minimas AS INTERVAL) AS horas_minimas ');
      FDQ_Append.SQL.Add('    ,CAST(:valor_hora AS NUMERIC(10,2)) AS valor_hora ');
      FDQ_Append.SQL.Add(') SRC ON (s.id = SRC.id AND SRC.id > 0) ');
      FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
      FDQ_Append.SQL.Add('  UPDATE SET ');
      FDQ_Append.SQL.Add('    nome = SRC.nome ');
      FDQ_Append.SQL.Add('    ,horas_minimas = SRC.horas_minimas ');
      FDQ_Append.SQL.Add('    ,valor_hora = SRC.valor_hora ');
        FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
        FDQ_Append.SQL.Add('  INSERT (nome, descricao, ativo, empresa_id, usuario_id) ');
        FDQ_Append.SQL.Add('  VALUES (SRC.nome, SRC.descricao, SRC.ativo, :empresa_id, :usuario_id) ');
        FDQ_Append.SQL.Add('RETURNING c.id ');

        fDm.FDConnection.StartTransaction;
        for var I := 0 to AJSon.Size -1 do
        begin
          var LObj := AJSon.Items[I] as TJSONObject;

          if Trim(LObj.GetValue<String>('nome','')) = '' then
          begin
            Result.Id := 404;
            Result.Menssage := 'Nome da Categoria não informado.';
            fDm.FDConnection.Rollback;
            Exit;
          end;

          FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
          FDQ_Append.ParamByName('nome').AsString := Trim(LObj.GetValue<String>('nome', ''));
          FDQ_Append.ParamByName('descricao').AsString := Trim(LObj.GetValue<String>('descricao', ''));
          FDQ_Append.ParamByName('ativo').AsBoolean := LObj.GetValue<Boolean>('ativo', True);
          FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
          FDQ_Append.ParamByName('usuario_id').AsInteger := aUsuarioId;
          FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Serviço inserido/atualizado com sucesso');
      Result.Menssage := 'Serviço Inserido/Atualizado com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Servico_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código do Serviço para excluir.';
        GravarLogJSON('uDataBase.Manager', 'Servico_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from servicos.servico where id = :Id and empresa_id = :empresa_id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Serviço ' + aId.ToString + ', excluído com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Serviço ' + aId.ToString + ' excluído com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Horas Trabalhadas }

function TDataBaseManager.HorasTrabalhadas_Listar(
  out fJson:TJSONArray;
  const aId: Integer = 0;
  const aUsuarioId: Integer = 0;
  const aClienteId: Integer = 0;
  const aServicoId: Integer = 0;
  const aDataInicial: TDateTime = 0;
  const aDataFinal: TDateTime = 0;
  const APagina:Integer=0;
  const APaginas:Integer=0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  ht.* ');
      FDQ_Select.Sql.Add('  ,u.nome as usuario_nome ');
      FDQ_Select.Sql.Add('  ,cl.nome as cliente_nome ');
      FDQ_Select.Sql.Add('  ,s.nome as servico_nome ');
      FDQ_Select.Sql.Add('from servicos.horas_trabalhadas ht ');
      FDQ_Select.Sql.Add('left join public.usuario u on u.id = ht.usuario_id ');
      FDQ_Select.Sql.Add('left join public.cliente cl on cl.id = ht.cliente_id ');
      FDQ_Select.Sql.Add('left join servicos.servico s on s.id = ht.servico_id ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and ht.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if aUsuarioId > 0 then
      begin
        FDQ_Select.Sql.Add('  and ht.usuario_id = :usuario_id ');
        FDQ_Select.ParamByName('usuario_id').AsInteger := aUsuarioId;
      end;
      if aClienteId > 0 then
      begin
        FDQ_Select.Sql.Add('  and ht.cliente_id = :cliente_id ');
        FDQ_Select.ParamByName('cliente_id').AsInteger := aClienteId;
      end;
      if aServicoId > 0 then
      begin
        FDQ_Select.Sql.Add('  and ht.servico_id = :servico_id ');
        FDQ_Select.ParamByName('servico_id').AsInteger := aServicoId;
      end;
      if aDataInicial > 0 then
      begin
        FDQ_Select.Sql.Add('  and ht.data_servico >= :data_inicial ');
        FDQ_Select.ParamByName('data_inicial').AsDateTime := aDataInicial;
      end;
      if aDataFinal > 0 then
      begin
        FDQ_Select.Sql.Add('  and ht.data_servico <= :data_final ');
        FDQ_Select.ParamByName('data_final').AsDateTime := aDataFinal;
      end;
      FDQ_Select.Sql.Add('  and (ht.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  ht.data_servico desc, ht.hora_inicio desc; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar as horas trabalhadas.';
        GravarLogJSON('uDataBase.Manager', 'HorasTrabalhadas_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.HorasTrabalhadas_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      FDQ_Append.SQL.Add('MERGE INTO servicos.horas_trabalhadas ht ');
      FDQ_Append.SQL.Add('USING ( ');
      FDQ_Append.SQL.Add('  SELECT ');
      FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
      FDQ_Append.SQL.Add('    ,CAST(:usuario_id AS INTEGER) AS usuario_id ');
      FDQ_Append.SQL.Add('    ,CAST(:cliente_id AS INTEGER) AS cliente_id ');
      FDQ_Append.SQL.Add('    ,CAST(:servico_id AS INTEGER) AS servico_id ');
      FDQ_Append.SQL.Add('    ,CAST(:valor_hora AS NUMERIC(10,2)) AS valor_hora ');
      FDQ_Append.SQL.Add('    ,CAST(:data_servico AS DATE) AS data_servico ');
      FDQ_Append.SQL.Add('    ,CAST(:hora_inicio AS TIME) AS hora_inicio ');
      FDQ_Append.SQL.Add('    ,CAST(:hora_termino AS TIME) AS hora_termino ');
      FDQ_Append.SQL.Add('    ,CAST(:quantidade_horas AS NUMERIC(10,5)) AS quantidade_horas ');
      FDQ_Append.SQL.Add('    ,CAST(:total_horas AS NUMERIC(10,2)) AS total_horas ');
      FDQ_Append.SQL.Add('    ,CAST(:observacoes AS TEXT) AS observacoes ');
      FDQ_Append.SQL.Add('    ,CAST(:empresa_id AS INTEGER) AS empresa_id ');
      FDQ_Append.SQL.Add(') SRC ON (ht.id = SRC.id AND SRC.id > 0) ');
      FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
      FDQ_Append.SQL.Add('  UPDATE SET ');
      FDQ_Append.SQL.Add('    usuario_id = SRC.usuario_id ');
      FDQ_Append.SQL.Add('    ,cliente_id = SRC.cliente_id ');
      FDQ_Append.SQL.Add('    ,servico_id = SRC.servico_id ');
      FDQ_Append.SQL.Add('    ,valor_hora = SRC.valor_hora ');
      FDQ_Append.SQL.Add('    ,data_servico = SRC.data_servico ');
      FDQ_Append.SQL.Add('    ,hora_inicio = SRC.hora_inicio ');
      FDQ_Append.SQL.Add('    ,hora_termino = SRC.hora_termino ');
      FDQ_Append.SQL.Add('    ,quantidade_horas = SRC.quantidade_horas ');
      FDQ_Append.SQL.Add('    ,total_horas = SRC.total_horas ');
      FDQ_Append.SQL.Add('    ,observacoes = SRC.observacoes ');
      FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
      FDQ_Append.SQL.Add('  INSERT (usuario_id, cliente_id, servico_id, valor_hora, data_servico, hora_inicio, hora_termino, quantidade_horas, total_horas, observacoes, empresa_id) ');
      FDQ_Append.SQL.Add('  VALUES (SRC.usuario_id, SRC.cliente_id, SRC.servico_id, SRC.valor_hora, SRC.data_servico, SRC.hora_inicio, SRC.hora_termino, SRC.quantidade_horas, SRC.total_horas, SRC.observacoes, SRC.empresa_id) ');
      FDQ_Append.SQL.Add('RETURNING ht.id ');

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if LObj.GetValue<Integer>('usuario_id', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Usuário não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        if LObj.GetValue<Integer>('cliente_id', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Cliente não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        if LObj.GetValue<Integer>('servico_id', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Serviço não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('usuario_id').AsInteger := LObj.GetValue<Integer>('usuario_id', 0);
        FDQ_Append.ParamByName('cliente_id').AsInteger := LObj.GetValue<Integer>('cliente_id', 0);
        FDQ_Append.ParamByName('servico_id').AsInteger := LObj.GetValue<Integer>('servico_id', 0);
        FDQ_Append.ParamByName('valor_hora').AsFloat := LObj.GetValue<Double>('valor_hora', 0);
        FDQ_Append.ParamByName('data_servico').AsDate := LObj.GetValue<TDateTime>('data_servico', 0);
        FDQ_Append.ParamByName('hora_inicio').AsString := LObj.GetValue<string>('hora_inicio', '00:00');
        FDQ_Append.ParamByName('hora_termino').AsString := LObj.GetValue<string>('hora_termino', '00:00');
        FDQ_Append.ParamByName('quantidade_horas').AsFloat := LObj.GetValue<Double>('quantidade_horas', 0);
        FDQ_Append.ParamByName('total_horas').AsFloat := LObj.GetValue<Double>('total_horas', 0);
        FDQ_Append.ParamByName('observacoes').AsString := LObj.GetValue<String>('observacoes', '');
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Horas trabalhadas inseridas/atualizadas com sucesso');
      Result.Menssage := 'Horas trabalhadas Inseridas/Atualizadas com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.HorasTrabalhadas_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código das Horas Trabalhadas para excluir.';
        GravarLogJSON('uDataBase.Manager', 'HorasTrabalhadas_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from servicos.horas_trabalhadas where id = :Id and empresa_id = :empresa_id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Horas Trabalhadas ' + aId.ToString + ', excluídas com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Horas Trabalhadas ' + aId.ToString + ' excluídas com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Horas Abatidas }

function TDataBaseManager.HorasAbatidas_Listar(
  out fJson:TJSONArray;
  const aId: Integer = 0;
  const aUsuarioId: Integer = 0;
  const aDataInicial: TDateTime = 0;
  const aDataFinal: TDateTime = 0;
  const APagina:Integer=0;
  const APaginas:Integer=0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  ha.* ');
      FDQ_Select.Sql.Add('  ,u.nome as usuario_nome ');
      FDQ_Select.Sql.Add('  ,c.nome as cliente_nome ');
      FDQ_Select.Sql.Add('  ,s.nome as servico_nome ');
      FDQ_Select.Sql.Add('from servicos.horas_abatidas ha ');
      FDQ_Select.Sql.Add('left join public.usuario u on u.id = ha.usuario_id ');
      FDQ_Select.Sql.Add('left join public.cliente c on c.id = ha.cliente_id ');
      FDQ_Select.Sql.Add('left join servicos.servico s on s.id = ha.servico_id ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and ha.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if aUsuarioId > 0 then
      begin
        FDQ_Select.Sql.Add('  and ha.usuario_id = :usuario_id ');
        FDQ_Select.ParamByName('usuario_id').AsInteger := aUsuarioId;
      end;
      if aDataInicial > 0 then
      begin
        FDQ_Select.Sql.Add('  and ha.data_abatimento >= :data_inicial ');
        FDQ_Select.ParamByName('data_inicial').AsDateTime := aDataInicial;
      end;
      if aDataFinal > 0 then
      begin
        FDQ_Select.Sql.Add('  and ha.data_abatimento <= :data_final ');
        FDQ_Select.ParamByName('data_final').AsDateTime := aDataFinal;
      end;
      FDQ_Select.Sql.Add('  and (ha.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  ha.data_abatimento desc, ha.id desc; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Nenhum abatimento encontrado.';
        fJson := TJSONArray.Create;
        Result.JSonArray := fJson;
        Exit;
      end;

      fJson := FDQ_Select.ToJSONArray();
      Result.Id := 200;
      Result.JSonArray := fJson;
      Result.Menssage := 'Abatimentos listados com sucesso';

    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        GravarLogJSON('uDataBase.Manager', 'HorasAbatidas_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.HorasAbatidas_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      FDQ_Append.SQL.Add('MERGE INTO servicos.horas_abatidas ha ');
      FDQ_Append.SQL.Add('USING ( ');
      FDQ_Append.SQL.Add('  SELECT ');
      FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
      FDQ_Append.SQL.Add('    ,CAST(:usuario_id AS INTEGER) AS usuario_id ');
      FDQ_Append.SQL.Add('    ,CAST(:cliente_id AS INTEGER) AS cliente_id ');
      FDQ_Append.SQL.Add('    ,CAST(:servico_id AS INTEGER) AS servico_id ');
      FDQ_Append.SQL.Add('    ,CAST(:data_abatimento AS DATE) AS data_abatimento ');
      FDQ_Append.SQL.Add('    ,CAST(:valor AS NUMERIC(10,2)) AS valor ');
      FDQ_Append.SQL.Add('    ,CAST(:valor_hora AS NUMERIC(10,2)) AS valor_hora ');
      FDQ_Append.SQL.Add('    ,CAST(:quantidade_horas AS NUMERIC(7,2)) AS quantidade_horas ');
      FDQ_Append.SQL.Add('    ,CAST(:observacoes AS TEXT) AS observacoes ');
      FDQ_Append.SQL.Add(') SRC ON (ha.id = SRC.id AND SRC.id > 0) ');
      FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
      FDQ_Append.SQL.Add('  UPDATE SET ');
      FDQ_Append.SQL.Add('    usuario_id = SRC.usuario_id ');
      FDQ_Append.SQL.Add('    ,cliente_id = SRC.cliente_id ');
      FDQ_Append.SQL.Add('    ,servico_id = SRC.servico_id ');
      FDQ_Append.SQL.Add('    ,data_abatimento = SRC.data_abatimento ');
      FDQ_Append.SQL.Add('    ,valor = SRC.valor ');
      FDQ_Append.SQL.Add('    ,valor_hora = SRC.valor_hora ');
      FDQ_Append.SQL.Add('    ,quantidade_horas = SRC.quantidade_horas ');
      FDQ_Append.SQL.Add('    ,observacoes = SRC.observacoes ');
      FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
      FDQ_Append.SQL.Add('  INSERT (usuario_id, cliente_id, servico_id, data_abatimento, valor, valor_hora, quantidade_horas, observacoes, empresa_id, usuario_cadastro) ');
      FDQ_Append.SQL.Add('  VALUES (SRC.usuario_id, SRC.cliente_id, SRC.servico_id, SRC.data_abatimento, SRC.valor, SRC.valor_hora, SRC.quantidade_horas, SRC.observacoes, :empresa_id, :usuario_cadastro) ');
      FDQ_Append.SQL.Add('RETURNING ha.id ');

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if LObj.GetValue<Integer>('usuario_id', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Usuário não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        if LObj.GetValue<Integer>('cliente_id', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Cliente não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        if LObj.GetValue<Integer>('servico_id', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Serviço não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('usuario_id').AsInteger := LObj.GetValue<Integer>('usuario_id', 0);
        FDQ_Append.ParamByName('cliente_id').AsInteger := LObj.GetValue<Integer>('cliente_id', 0);
        FDQ_Append.ParamByName('servico_id').AsInteger := LObj.GetValue<Integer>('servico_id', 0);
        FDQ_Append.ParamByName('data_abatimento').AsDate := LObj.GetValue<TDateTime>('data_abatimento', 0);
        FDQ_Append.ParamByName('valor').AsFloat := LObj.GetValue<Double>('valor', 0);
        FDQ_Append.ParamByName('valor_hora').AsFloat := LObj.GetValue<Double>('valor_hora', 0);
        FDQ_Append.ParamByName('quantidade_horas').AsFloat := LObj.GetValue<Double>('quantidade_horas', 0);
        FDQ_Append.ParamByName('observacoes').AsString := LObj.GetValue<String>('observacoes', '');
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.ParamByName('usuario_cadastro').AsInteger := aUsuarioId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Abatimento inserido/atualizado com sucesso');
      Result.Menssage := 'Abatimento Inserido/Atualizado com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.HorasAbatidas_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código do Abatimento para excluir.';
        GravarLogJSON('uDataBase.Manager', 'HorasAbatidas_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from servicos.horas_abatidas where id = :Id and empresa_id = :empresa_id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Abatimento ' + aId.ToString + ', excluído com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Abatimento ' + aId.ToString + ' excluído com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Horas Excedidas }

function TDataBaseManager.HorasExcedidas_Listar(
  out fJson:TJSONArray;
  const aId: Integer = 0;
  const aUsuarioId: Integer = 0;
  const aClienteId: Integer = 0;
  const aServicoId: Integer = 0;
  const aAnoOrigem: Integer = 0;
  const aMesOrigem: Integer = 0;
  const APagina:Integer=0;
  const APaginas:Integer=0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1; Menssage := EmptyStr; JSonObject := Nil; JSonArray := Nil;
  end;
  FDQ_Select := nil; fDm := nil;
  try
    try
      var fPagina := 0;
      var fPaginas := APaginas;
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  he.* ');
      FDQ_Select.Sql.Add('  ,u.nome as usuario_nome ');
      FDQ_Select.Sql.Add('  ,c.nome as cliente_nome ');
      FDQ_Select.Sql.Add('  ,s.nome as servico_nome ');
      FDQ_Select.Sql.Add('from servicos.horas_excedidas he ');
      FDQ_Select.Sql.Add('left join public.usuario u on u.id = he.usuario_id ');
      FDQ_Select.Sql.Add('left join public.cliente c on c.id = he.cliente_id ');
      FDQ_Select.Sql.Add('left join servicos.servico s on s.id = he.servico_id ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then begin
        FDQ_Select.Sql.Add('  and he.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if aUsuarioId > 0 then begin
        FDQ_Select.Sql.Add('  and he.usuario_id = :usuario_id ');
        FDQ_Select.ParamByName('usuario_id').AsInteger := aUsuarioId;
      end;
      if aClienteId > 0 then begin
        FDQ_Select.Sql.Add('  and he.cliente_id = :cliente_id ');
        FDQ_Select.ParamByName('cliente_id').AsInteger := aClienteId;
      end;
      if aServicoId > 0 then begin
        FDQ_Select.Sql.Add('  and he.servico_id = :servico_id ');
        FDQ_Select.ParamByName('servico_id').AsInteger := aServicoId;
      end;
      if aAnoOrigem > 0 then begin
        FDQ_Select.Sql.Add('  and he.ano_origem = :ano_origem ');
        FDQ_Select.ParamByName('ano_origem').AsInteger := aAnoOrigem;
      end;
      if aMesOrigem > 0 then begin
        FDQ_Select.Sql.Add('  and he.mes_origem = :mes_origem ');
        FDQ_Select.ParamByName('mes_origem').AsInteger := aMesOrigem;
      end;
      FDQ_Select.Sql.Add('  and (he.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  he.ano_origem desc, he.mes_origem desc, he.id desc; ');
      if ((APagina > 0) and (FPaginas > 0)) then begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then begin
        Result.Id := 404;
        Result.Menssage := 'Nenhum registro de horas excedidas encontrado.';
        fJson := TJSONArray.Create;
        Result.JSonArray := fJson;
        Exit;
      end;
      fJson := FDQ_Select.ToJSONArray();
      Result.Id := 200;
      Result.JSonArray := fJson;
      Result.Menssage := 'Horas excedidas listadas com sucesso';
    except
      on E: EDatabaseError do begin
        Result.Id := 500; Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then FDQ_Select.Free;
    if Assigned(fDm) then fDm.Free;
  end;
end;

function TDataBaseManager.HorasExcedidas_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do begin
    Id := -1; Menssage := EmptyStr; JSonObject := Nil; JSonArray := Nil;
  end;
  fDm := nil; FDQ_Append := nil;
  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then fDm.ConectarBanco;

      if AJSon.Size = 0 then begin
        Result.Id := 400; Result.Menssage := 'JSon não informado.'; Exit;
      end;

      FDQ_Append.SQL.Add('MERGE INTO servicos.horas_excedidas he ');
      FDQ_Append.SQL.Add('USING ( ');
      FDQ_Append.SQL.Add('  SELECT ');
      FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
      FDQ_Append.SQL.Add('    ,CAST(:usuario_id AS INTEGER) AS usuario_id ');
      FDQ_Append.SQL.Add('    ,CAST(:cliente_id AS INTEGER) AS cliente_id ');
      FDQ_Append.SQL.Add('    ,CAST(:servico_id AS INTEGER) AS servico_id ');
      FDQ_Append.SQL.Add('    ,CAST(:mes_origem AS INTEGER) AS mes_origem ');
      FDQ_Append.SQL.Add('    ,CAST(:ano_origem AS INTEGER) AS ano_origem ');
      FDQ_Append.SQL.Add('    ,CAST(:delta_horas AS NUMERIC(10,2)) AS delta_horas ');
      FDQ_Append.SQL.Add(') SRC ON (he.id = SRC.id AND SRC.id > 0) ');
      FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
      FDQ_Append.SQL.Add('  UPDATE SET ');
      FDQ_Append.SQL.Add('    usuario_id = SRC.usuario_id ');
      FDQ_Append.SQL.Add('    ,cliente_id = SRC.cliente_id ');
      FDQ_Append.SQL.Add('    ,servico_id = SRC.servico_id ');
      FDQ_Append.SQL.Add('    ,mes_origem = SRC.mes_origem ');
      FDQ_Append.SQL.Add('    ,ano_origem = SRC.ano_origem ');
      FDQ_Append.SQL.Add('    ,delta_horas = SRC.delta_horas ');
      FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
      FDQ_Append.SQL.Add('  INSERT (usuario_id, cliente_id, servico_id, mes_origem, ano_origem, delta_horas, empresa_id, usuario_cadastro) ');
      FDQ_Append.SQL.Add('  VALUES (SRC.usuario_id, SRC.cliente_id, SRC.servico_id, SRC.mes_origem, SRC.ano_origem, SRC.delta_horas, :empresa_id, :usuario_cadastro) ');
      FDQ_Append.SQL.Add('RETURNING he.id ');

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;
        if LObj.GetValue<Integer>('usuario_id', 0) = 0 then begin
          Result.Id := 404; Result.Menssage := 'Usuário não informado.';
          fDm.FDConnection.Rollback; Exit;
        end;
        if LObj.GetValue<Integer>('cliente_id', 0) = 0 then begin
          Result.Id := 404; Result.Menssage := 'Cliente não informado.';
          fDm.FDConnection.Rollback; Exit;
        end;
        if LObj.GetValue<Integer>('servico_id', 0) = 0 then begin
          Result.Id := 404; Result.Menssage := 'Serviço não informado.';
          fDm.FDConnection.Rollback; Exit;
        end;

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('usuario_id').AsInteger := LObj.GetValue<Integer>('usuario_id', 0);
        FDQ_Append.ParamByName('cliente_id').AsInteger := LObj.GetValue<Integer>('cliente_id', 0);
        FDQ_Append.ParamByName('servico_id').AsInteger := LObj.GetValue<Integer>('servico_id', 0);
        FDQ_Append.ParamByName('mes_origem').AsInteger := LObj.GetValue<Integer>('mes_origem', 0);
        FDQ_Append.ParamByName('ano_origem').AsInteger := LObj.GetValue<Integer>('ano_origem', 0);
        FDQ_Append.ParamByName('delta_horas').AsFloat := LObj.GetValue<Double>('delta_horas', 0);
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.ParamByName('usuario_cadastro').AsInteger := aUsuarioId;
        FDQ_Append.Open;
        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;
      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Horas excedidas inseridas/atualizadas com sucesso');
      Result.Menssage := 'Horas excedidas inseridas/atualizadas com sucesso. Código: ' + FCódigoRetorno.ToString;
    except
      on E: EDatabaseError do begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then fDm.FDConnection.Rollback;
        Result.Id := 500; Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then fDm.FDConnection.Rollback;
        Result.Id := 400; Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then fDm.FDConnection.Rollback;
        Result.Id := 500; Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then FDQ_Append.Free;
    if Assigned(fDm) then fDm.Free;
  end;
end;

function TDataBaseManager.HorasExcedidas_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do begin
    Id := -1; Menssage := EmptyStr; JSonObject := Nil; JSonArray := Nil;
  end;
  FDQ_Select := nil; fDm := nil;
  try
    try
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then fDm.ConectarBanco;

      if aId = 0 then begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código do registro para excluir.';
        GravarLogJSON('uDataBase.Manager', 'HorasExcedidas_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;
      FDQ_Select.Close; FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from servicos.horas_excedidas where id = :Id and empresa_id = :empresa_id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Registro ' + aId.ToString + ', excluído com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Registro ' + aId.ToString + ' excluído com sucesso';
      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do begin
        Result.Id := 500; Result.Menssage := 'Erro no banco de dados: ' + E.Message; fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do begin
        Result.Id := 400; Result.Menssage := 'Parâmetros inválidos: ' + E.Message; fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do begin
        Result.Id := 403; Result.Menssage := 'Acesso não permitido.'; fDm.FDConnection.Rollback;
      end;
      on E: Exception do begin
        Result.Id := 500; Result.Menssage := 'Erro inesperado: ' + E.Message; fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then FDQ_Select.Free;
    if Assigned(fDm) then fDm.Free;
  end;
end;

{ Empresa }

function TDataBaseManager.Empresa_Listar(
  out fJson:TJSONArray;
  const aId: Integer = 0;
  const aNome: String = '';
  const APagina:Integer=0;
  const APaginas:Integer=0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  e.id, ');
      FDQ_Select.Sql.Add('  e.razao_social as nome, ');
      FDQ_Select.Sql.Add('  e.razao_social, ');
      FDQ_Select.Sql.Add('  e.fantasia, ');
      FDQ_Select.Sql.Add('  e.cnpj_cpf, ');
      FDQ_Select.Sql.Add('  e.inscricao_estadual_identidade, ');
      FDQ_Select.Sql.Add('  e.regime_tributario, ');
      FDQ_Select.Sql.Add('  e.endereco, ');
      FDQ_Select.Sql.Add('  e.telefone, ');
      FDQ_Select.Sql.Add('  e.celular, ');
      FDQ_Select.Sql.Add('  e.email ');
      FDQ_Select.Sql.Add('from public.empresa e ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and e.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if Trim(aNome) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(e.razao_social) like upper(:nome) ');
        FDQ_Select.ParamByName('nome').AsString := '%'+aNome+'%';
      end;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  e.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar as empresas.';
        GravarLogJSON('uDataBase.Manager', 'Empresa_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Empresa_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if Trim(LObj.GetValue<String>('razao_social','')) = '' then
        begin
          Result.Id := 404;
          Result.Menssage := 'Razão Social da Empresa não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        var fCódigo := LObj.GetValue<Integer>('codigo', 0);

        FDQ_Append.Close;
        FDQ_Append.SQL.Clear;

        if fCódigo > 0 then
        begin
          FDQ_Append.SQL.Add('UPDATE public.empresa SET ');
          FDQ_Append.SQL.Add('  razao_social = :razao_social, ');
          FDQ_Append.SQL.Add('  fantasia = :fantasia, ');
          FDQ_Append.SQL.Add('  cnpj_cpf = :cnpj_cpf, ');
          FDQ_Append.SQL.Add('  inscricao_estadual_identidade = :inscricao_estadual_identidade, ');
          FDQ_Append.SQL.Add('  regime_tributario = :regime_tributario, ');
          FDQ_Append.SQL.Add('  endereco = :endereco, ');
          FDQ_Append.SQL.Add('  telefone = :telefone, ');
          FDQ_Append.SQL.Add('  celular = :celular, ');
          FDQ_Append.SQL.Add('  email = :email ');
          FDQ_Append.SQL.Add('WHERE id = :id ');
          FDQ_Append.SQL.Add('RETURNING id ');
          FDQ_Append.ParamByName('id').AsInteger := fCódigo;
        end
        else
        begin
          FDQ_Append.SQL.Add('INSERT INTO public.empresa ');
          FDQ_Append.SQL.Add('  (razao_social, fantasia, cnpj_cpf, inscricao_estadual_identidade, regime_tributario, endereco, telefone, celular, email) ');
          FDQ_Append.SQL.Add('VALUES ');
          FDQ_Append.SQL.Add('  (:razao_social, :fantasia, :cnpj_cpf, :inscricao_estadual_identidade, :regime_tributario, :endereco, :telefone, :celular, :email) ');
          FDQ_Append.SQL.Add('RETURNING id ');
        end;

        FDQ_Append.ParamByName('razao_social').AsString := Trim(LObj.GetValue<String>('razao_social', ''));
        FDQ_Append.ParamByName('fantasia').AsString := Trim(LObj.GetValue<String>('fantasia', ''));
        FDQ_Append.ParamByName('cnpj_cpf').AsString := Trim(LObj.GetValue<String>('cnpj_cpf', ''));
        FDQ_Append.ParamByName('inscricao_estadual_identidade').AsString := Trim(LObj.GetValue<String>('inscricao_estadual_identidade', ''));
        FDQ_Append.ParamByName('regime_tributario').AsString := Trim(LObj.GetValue<String>('regime_tributario', ''));
        FDQ_Append.ParamByName('endereco').AsString := Trim(LObj.GetValue<String>('endereco', ''));
        FDQ_Append.ParamByName('telefone').AsString := Trim(LObj.GetValue<String>('telefone', ''));
        FDQ_Append.ParamByName('celular').AsString := Trim(LObj.GetValue<String>('celular', ''));
        FDQ_Append.ParamByName('email').AsString := Trim(LObj.GetValue<String>('email', ''));
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Empresa inserida/atualizada com sucesso');
      Result.Menssage := 'Empresa Inserida/Atualizada com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Empresa_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      if aId <= 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'Código da Empresa não informado.';
        Exit;
      end;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from public.empresa where id = :Id ');
      FDQ_Select.ParamByName('Id').AsInteger := aId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('mensagem', 'Empresa excluída com sucesso');
      Result.Menssage := 'Empresa excluída com sucesso';

    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Formulario }

function TDataBaseManager.Formulario_Listar(
  out fJson:TJSONArray;
  const aId: Integer = 0;
  const aNome: String = '';
  const APagina:Integer=0;
  const APaginas:Integer=0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  f.* ');
      FDQ_Select.Sql.Add('from public.formulario f ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and f.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if Trim(aNome) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(f.nome) like upper(:nome) ');
        FDQ_Select.ParamByName('nome').AsString := '%'+aNome+'%';
      end;
      FDQ_Select.Sql.Add('  and (f.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  f.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar os formulários.';
        GravarLogJSON('uDataBase.Manager', 'Formulario_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Formulario_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      FDQ_Append.SQL.Add('MERGE INTO public.formulario f ');
      FDQ_Append.SQL.Add('USING ( ');
      FDQ_Append.SQL.Add('  SELECT ');
      FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
      FDQ_Append.SQL.Add('    ,CAST(:nome AS VARCHAR(100)) AS nome ');
      FDQ_Append.SQL.Add(') SRC ON (f.id = SRC.id AND SRC.id > 0) ');
      FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
      FDQ_Append.SQL.Add('  UPDATE SET ');
      FDQ_Append.SQL.Add('    nome = SRC.nome ');
      FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
      FDQ_Append.SQL.Add('  INSERT (nome, empresa_id, usuario_id) ');
      FDQ_Append.SQL.Add('  VALUES (SRC.nome, :empresa_id, :usuario_id) ');
      FDQ_Append.SQL.Add('RETURNING f.id ');

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if Trim(LObj.GetValue<String>('nome','')) = '' then
        begin
          Result.Id := 404;
          Result.Menssage := 'Nome do Formulário não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('nome').AsString := Trim(LObj.GetValue<String>('nome', ''));
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.ParamByName('usuario_id').AsInteger := aUsuarioId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Formulário inserido/atualizado com sucesso');
      Result.Menssage := 'Formulário Inserido/Atualizado com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Formulario_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código do Formulário para excluir.';
        GravarLogJSON('uDataBase.Manager', 'Formulario_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from public.usuario_formulario where formulario_id = :Id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ExecSQL;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from public.formulario where id = :Id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Formulário ' + aId.ToString + ', excluído com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Formulário ' + aId.ToString + ' excluído com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Usuário Formulário }

function TDataBaseManager.UsuarioFormulario_Listar(
  out fJson:TJSONArray;
  const aId: Integer = 0;
  const aUsuarioId: Integer = 0;
  const aFormularioId: Integer = 0;
  const APagina:Integer=0;
  const APaginas:Integer=0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  uf.* ');
      FDQ_Select.Sql.Add('  ,u.nome as usuario_nome ');
      FDQ_Select.Sql.Add('  ,f.nome as formulario_nome ');
      FDQ_Select.Sql.Add('from public.usuario_formulario uf ');
      FDQ_Select.Sql.Add('left join public.usuario u on u.id = uf.usuario_id ');
      FDQ_Select.Sql.Add('left join public.formulario f on f.id = uf.formulario_id ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and uf.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if aUsuarioId > 0 then
      begin
        FDQ_Select.Sql.Add('  and uf.usuario_id = :usuario_id ');
        FDQ_Select.ParamByName('usuario_id').AsInteger := aUsuarioId;
      end;
      if aFormularioId > 0 then
      begin
        FDQ_Select.Sql.Add('  and uf.formulario_id = :formulario_id ');
        FDQ_Select.ParamByName('formulario_id').AsInteger := aFormularioId;
      end;
      FDQ_Select.Sql.Add('  and (uf.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  uf.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar os vínculos usuário/formulário.';
        GravarLogJSON('uDataBase.Manager', 'UsuarioFormulario_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.UsuarioFormulario_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      FDQ_Append.SQL.Add('MERGE INTO public.usuario_formulario uf ');
      FDQ_Append.SQL.Add('USING ( ');
      FDQ_Append.SQL.Add('  SELECT ');
      FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
      FDQ_Append.SQL.Add('    ,CAST(:usuario_id AS INTEGER) AS usuario_id ');
      FDQ_Append.SQL.Add('    ,CAST(:formulario_id AS INTEGER) AS formulario_id ');
      FDQ_Append.SQL.Add(') SRC ON (uf.id = SRC.id AND SRC.id > 0) ');
      FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
      FDQ_Append.SQL.Add('  UPDATE SET ');
      FDQ_Append.SQL.Add('    usuario_id = SRC.usuario_id ');
      FDQ_Append.SQL.Add('    ,formulario_id = SRC.formulario_id ');
      FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
      FDQ_Append.SQL.Add('  INSERT (usuario_id, formulario_id, empresa_id, usuario_cadastro) ');
      FDQ_Append.SQL.Add('  VALUES (SRC.usuario_id, SRC.formulario_id, :empresa_id, :usuario_cadastro) ');
      FDQ_Append.SQL.Add('RETURNING uf.id ');

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if LObj.GetValue<Integer>('usuario_id', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Usuário não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        if LObj.GetValue<Integer>('formulario_id', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Formulário não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('usuario_id').AsInteger := LObj.GetValue<Integer>('usuario_id', 0);
        FDQ_Append.ParamByName('formulario_id').AsInteger := LObj.GetValue<Integer>('formulario_id', 0);
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.ParamByName('usuario_cadastro').AsInteger := aUsuarioId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Vínculo usuário/formulário inserido/atualizado com sucesso');
      Result.Menssage := 'Vínculo usuário/formulário Inserido/Atualizado com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.UsuarioFormulario_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código do Vínculo para excluir.';
        GravarLogJSON('uDataBase.Manager', 'UsuarioFormulario_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from public.usuario_formulario where id = :Id and empresa_id = :empresa_id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Vínculo ' + aId.ToString + ', excluído com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Vínculo ' + aId.ToString + ' excluído com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Permissao_Listar(out fJson: TJSONArray; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select p.* from public.permissao p where (p.empresa_id = :empresa_id or :empresa_id = 0) order by p.id ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Nenhuma permissão encontrada.';
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.UsuarioFormularioPermissao_Listar(
  out fJson: TJSONArray;
  const aUsuarioFormularioId: Integer = 0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select p.nome ');
      FDQ_Select.Sql.Add('from public.usuario_formulario_permissao ufp ');
      FDQ_Select.Sql.Add('join public.permissao p on p.id = ufp.permissao_id ');
      FDQ_Select.Sql.Add('where ufp.usuario_formulario_id = :id ');
      FDQ_Select.ParamByName('id').AsInteger := aUsuarioFormularioId;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 200;
        fJson := TJSONArray.Create;
        Result.JSonArray := fJson;
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.UsuarioFormularioPermissao_Salvar(
  const aUsuarioFormularioId: Integer;
  const aPermissoes: TJSONArray;
  const aEmpresaId: Integer;
  const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  i: Integer;
  lPermId: Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      fDm.FDConnection.StartTransaction;

      FDQ_Append.Close;
      FDQ_Append.Sql.Clear;
      FDQ_Append.Sql.Add('delete from public.usuario_formulario_permissao ');
      FDQ_Append.Sql.Add('where usuario_formulario_id = :id ');
      FDQ_Append.ParamByName('id').AsInteger := aUsuarioFormularioId;
      FDQ_Append.ExecSQL;

      for i := 0 to aPermissoes.Size - 1 do
      begin
        var lPermNome := aPermissoes.Items[i].Value;

        FDQ_Append.Close;
        FDQ_Append.Sql.Clear;
        FDQ_Append.Sql.Add('select id from public.permissao where nome = :nome ');
        FDQ_Append.ParamByName('nome').AsString := lPermNome;
        FDQ_Append.Open;

        if FDQ_Append.IsEmpty then
        begin
          Result.Id := 400;
          Result.Menssage := 'Permissão "' + lPermNome + '" não encontrada.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        lPermId := FDQ_Append.Fields[0].AsInteger;

        FDQ_Append.Close;
        FDQ_Append.Sql.Clear;
        FDQ_Append.Sql.Add('insert into public.usuario_formulario_permissao ');
        FDQ_Append.Sql.Add('  (usuario_formulario_id, permissao_id) ');
        FDQ_Append.Sql.Add('values ');
        FDQ_Append.Sql.Add('  (:uf_id, :perm_id) ');
        FDQ_Append.ParamByName('uf_id').AsInteger := aUsuarioFormularioId;
        FDQ_Append.ParamByName('perm_id').AsInteger := lPermId;
        FDQ_Append.ExecSQL;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('mensagem', 'Permissões salvas com sucesso');

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Usuario_Permissoes(
  out fJson: TJSONArray;
  const aUsuarioId: Integer;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  uf.id as uf_id, ');
      FDQ_Select.Sql.Add('  f.nome as formulario_nome ');
      FDQ_Select.Sql.Add('from public.usuario_formulario uf ');
      FDQ_Select.Sql.Add('join public.formulario f on f.id = uf.formulario_id ');
      FDQ_Select.Sql.Add('where uf.usuario_id = :usuario_id ');
      if aEmpresaId > 0 then
      begin
        FDQ_Select.Sql.Add('and (uf.empresa_id = :perm_empresa_id or :perm_empresa_id = 0) ');
        FDQ_Select.ParamByName('perm_empresa_id').AsInteger := aEmpresaId;
      end;
      FDQ_Select.Sql.Add('order by f.nome ');
      FDQ_Select.ParamByName('usuario_id').AsInteger := aUsuarioId;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 200;
        fJson := TJSONArray.Create;
        Result.JSonArray := fJson;
        Exit;
      end;

      var lResultArray := TJSONArray.Create;
      FDQ_Select.First;
      while not FDQ_Select.Eof do
      begin
        var lUfId := FDQ_Select.FieldByName('uf_id').AsInteger;
        var lFormNome := FDQ_Select.FieldByName('formulario_nome').AsString;

        var lPermArray := TJSONArray.Create;
        var lPermQry: TFDQuery := TFDQuery.Create(nil);
        try
          lPermQry.Connection := fDm.FDConnection;
          lPermQry.Close;
          lPermQry.Sql.Clear;
          lPermQry.Sql.Add('select p.nome ');
          lPermQry.Sql.Add('from public.usuario_formulario_permissao ufp ');
          lPermQry.Sql.Add('join public.permissao p on p.id = ufp.permissao_id ');
          lPermQry.Sql.Add('where ufp.usuario_formulario_id = :id ');
          lPermQry.ParamByName('id').AsInteger := lUfId;
          lPermQry.Open;

          while not lPermQry.Eof do
          begin
            lPermArray.Add(lPermQry.Fields[0].AsString);
            lPermQry.Next;
          end;
        finally
          lPermQry.Free;
        end;

        var lItemObj := TJSONObject.Create;
        lItemObj.AddPair('nome', lFormNome);
        lItemObj.AddPair('permissoes', lPermArray);
        lResultArray.AddElement(lItemObj);

        FDQ_Select.Next;
      end;

      fJson := lResultArray;
      Result.Id := 200;
      Result.JSonArray := fJson;

    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Insumos }

function TDataBaseManager.Insumo_Listar(out fJson:TJSONArray; const aId:Integer=0; const aNome:String=''; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  i.* ');
      FDQ_Select.Sql.Add('from producao.insumo i ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and i.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if Trim(aNome) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(i.nome) like upper(:nome) ');
        FDQ_Select.ParamByName('nome').AsString := '%'+aNome+'%';
      end;
      FDQ_Select.Sql.Add('  and (i.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  i.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar os insumos.';
        GravarLogJSON('uDataBase.Manager', 'Insumo_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Insumo_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if Trim(LObj.GetValue<String>('nome','')) = '' then
        begin
          Result.Id := 404;
          Result.Menssage := 'Nome do Insumo não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.SQL.Add('MERGE INTO producao.insumo i ');
        FDQ_Append.SQL.Add('USING ( ');
        FDQ_Append.SQL.Add('  SELECT ');
        FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
        FDQ_Append.SQL.Add('    ,CAST(:nome AS VARCHAR(150)) AS nome ');
        FDQ_Append.SQL.Add('    ,CAST(:unidade_medida AS VARCHAR(20)) AS unidade_medida ');
        FDQ_Append.SQL.Add('    ,CAST(:custo_medio AS NUMERIC(10,2)) AS custo_medio ');
        FDQ_Append.SQL.Add('    ,CAST(:ativo AS BOOLEAN) AS ativo ');
        FDQ_Append.SQL.Add(') SRC ON (i.id = SRC.id AND SRC.id > 0) ');
        FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
        FDQ_Append.SQL.Add('  UPDATE SET ');
        FDQ_Append.SQL.Add('    nome = SRC.nome ');
        FDQ_Append.SQL.Add('    ,unidade_medida = SRC.unidade_medida ');
        FDQ_Append.SQL.Add('    ,custo_medio = SRC.custo_medio ');
        FDQ_Append.SQL.Add('    ,ativo = SRC.ativo ');
      FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
      FDQ_Append.SQL.Add('  INSERT (nome, unidade_medida, custo_medio, ativo, empresa_id, usuario_id) ');
      FDQ_Append.SQL.Add('  VALUES (SRC.nome, SRC.unidade_medida, SRC.custo_medio, SRC.ativo, :empresa_id, :usuario_id) ');
      FDQ_Append.SQL.Add('RETURNING i.id ');

      FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
      FDQ_Append.ParamByName('nome').AsString := Trim(LObj.GetValue<String>('nome', ''));
      FDQ_Append.ParamByName('unidade_medida').AsString := Trim(LObj.GetValue<String>('unidade_medida', ''));
      FDQ_Append.ParamByName('custo_medio').AsFloat := LObj.GetValue<Double>('custo_medio', 0);
      FDQ_Append.ParamByName('ativo').AsBoolean := LObj.GetValue<Boolean>('ativo', True);
      FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Append.ParamByName('usuario_id').AsInteger := aUsuarioId;
      FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Insumo inserido/atualizado com sucesso');
      Result.Menssage := 'Insumo Inserido/Atualizado com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Insumo_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
  lQtdCompra, lQtdReceita, lQtdFabricacao: Integer;
  lMsgVinculos: string;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código do Insumo para excluir.';
        GravarLogJSON('uDataBase.Manager', 'Insumo_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  (select count(1) from producao.compra_insumo where insumo_id = :Id) as qtd_compra, ');
      FDQ_Select.Sql.Add('  (select count(1) from producao.receita_ingrediente where insumo_id = :Id) as qtd_receita, ');
      FDQ_Select.Sql.Add('  (select count(1) from producao.fabricacao f ');
      FDQ_Select.Sql.Add('   where f.produto_fabricado_id in ( ');
      FDQ_Select.Sql.Add('     select ri.produto_fabricado_id from producao.receita_ingrediente ri ');
      FDQ_Select.Sql.Add('     where ri.insumo_id = :Id)) as qtd_fabricacao ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.Open;

      lQtdCompra := FDQ_Select.FieldByName('qtd_compra').AsInteger;
      lQtdReceita := FDQ_Select.FieldByName('qtd_receita').AsInteger;
      lQtdFabricacao := FDQ_Select.FieldByName('qtd_fabricacao').AsInteger;

      if (lQtdCompra > 0) or (lQtdReceita > 0) or (lQtdFabricacao > 0) then
      begin
        lMsgVinculos := '';
        if lQtdCompra > 0 then
          lMsgVinculos := lMsgVinculos + Format(' compras (%d registro(s))', [lQtdCompra]);
        if lQtdReceita > 0 then
          lMsgVinculos := lMsgVinculos + Format(' receitas (%d registro(s))', [lQtdReceita]);
        if lQtdFabricacao > 0 then
          lMsgVinculos := lMsgVinculos + Format(' fabricação (%d registro(s))', [lQtdFabricacao]);

        Result.Id := 400;
        Result.Menssage := 'Insumo não pode ser excluído pois possui v�nculo com:' + lMsgVinculos +
          '. Remova os vínculos ou apenas inative o insumo.';
        fJson := TJSONObject.Create(TJSONPair.Create('erro', Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from producao.insumo where id = :Id and empresa_id = :empresa_id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.ExecSQL;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Insumo ' + aId.ToString + ', excluído com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Insumo ' + aId.ToString + ' excluído com sucesso';

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Compra Insumo }

function TDataBaseManager.CompraInsumo_Listar(out fJson:TJSONArray; const aId:Integer=0; const aInsumoId:Integer=0; const aDataInicial:TDateTime=0; const aDataFinal:TDateTime=0; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  ci.*, i.nome as insumo_nome, f.nome as fornecedor_nome ');
      FDQ_Select.Sql.Add('from producao.compra_insumo ci ');
      FDQ_Select.Sql.Add('left join producao.insumo i on i.id = ci.insumo_id ');
      FDQ_Select.Sql.Add('left join public.fornecedor f on f.id = ci.fornecedor_id ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and ci.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if aInsumoId > 0 then
      begin
        FDQ_Select.Sql.Add('  and ci.insumo_id = :insumo_id ');
        FDQ_Select.ParamByName('insumo_id').AsInteger := aInsumoId;
      end;
      if (aDataInicial > 0) and (aDataFinal > 0) then
      begin
        FDQ_Select.Sql.Add('  and ci.data_compra between :dataInicial and :dataFinal ');
        FDQ_Select.ParamByName('dataInicial').AsDateTime := aDataInicial;
        FDQ_Select.ParamByName('dataFinal').AsDateTime := aDataFinal;
      end;
      FDQ_Select.Sql.Add('  and (ci.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  ci.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar as compras de insumo.';
        GravarLogJSON('uDataBase.Manager', 'CompraInsumo_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.CompraInsumo_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        var lCódigo := LObj.GetValue<Integer>('codigo', 0);
        var lInsumoId := LObj.GetValue<Integer>('insumo_id', 0);
        var lQuantidade := LObj.GetValue<Double>('quantidade', 0);
        var lDataCompra := LObj.GetValue<TDateTime>('data_compra', 0);
        var lOldQuantidade: Double := 0;

        // If updating, read old values for stock delta calculation
        if lCódigo > 0 then
        begin
          var FDQ_Old := TFDQuery.Create(nil);
          try
            FDQ_Old.Connection := fDm.FDConnection;
            FDQ_Old.SQL.Text := 'SELECT quantidade FROM producao.compra_insumo WHERE id = :id';
            FDQ_Old.ParamByName('id').AsInteger := lCódigo;
            FDQ_Old.Open;
            if not FDQ_Old.IsEmpty then
              lOldQuantidade := FDQ_Old.Fields[0].AsFloat;
          finally
            FDQ_Old.Free;
          end;
        end;

        if lInsumoId = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Insumo não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.SQL.Add('MERGE INTO producao.compra_insumo ci ');
        FDQ_Append.SQL.Add('USING ( ');
        FDQ_Append.SQL.Add('  SELECT ');
        FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
        FDQ_Append.SQL.Add('    ,CAST(:insumo_id AS INTEGER) AS insumo_id ');
        FDQ_Append.SQL.Add('    ,CAST(:fornecedor_id AS INTEGER) AS fornecedor_id ');
        FDQ_Append.SQL.Add('    ,CAST(:quantidade AS NUMERIC(10,2)) AS quantidade ');
        FDQ_Append.SQL.Add('    ,CAST(:valor_total AS NUMERIC(10,2)) AS valor_total ');
        FDQ_Append.SQL.Add('    ,CAST(:valor_unitario AS NUMERIC(10,2)) AS valor_unitario ');
        FDQ_Append.SQL.Add('    ,CAST(:data_compra AS DATE) AS data_compra ');
        FDQ_Append.SQL.Add('    ,CAST(:observacao AS VARCHAR(500)) AS observacao ');
        FDQ_Append.SQL.Add(') SRC ON (ci.id = SRC.id AND SRC.id > 0) ');
        FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
        FDQ_Append.SQL.Add('  UPDATE SET ');
        FDQ_Append.SQL.Add('    insumo_id = SRC.insumo_id ');
        FDQ_Append.SQL.Add('    ,fornecedor_id = SRC.fornecedor_id ');
        FDQ_Append.SQL.Add('    ,quantidade = SRC.quantidade ');
        FDQ_Append.SQL.Add('    ,valor_total = SRC.valor_total ');
        FDQ_Append.SQL.Add('    ,valor_unitario = SRC.valor_unitario ');
        FDQ_Append.SQL.Add('    ,data_compra = SRC.data_compra ');
        FDQ_Append.SQL.Add('    ,observacao = SRC.observacao ');
        FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
        FDQ_Append.SQL.Add('  INSERT (insumo_id, fornecedor_id, quantidade, valor_total, valor_unitario, data_compra, observacao, empresa_id, usuario_id) ');
        FDQ_Append.SQL.Add('  VALUES (SRC.insumo_id, SRC.fornecedor_id, SRC.quantidade, SRC.valor_total, SRC.valor_unitario, SRC.data_compra, SRC.observacao, :empresa_id, :usuario_cadastro) ');
        FDQ_Append.SQL.Add('RETURNING ci.id ');

        FDQ_Append.ParamByName('id').AsInteger := lCódigo;
        FDQ_Append.ParamByName('insumo_id').AsInteger := lInsumoId;
        FDQ_Append.ParamByName('fornecedor_id').AsInteger := LObj.GetValue<Integer>('fornecedor_id', 0);
        FDQ_Append.ParamByName('quantidade').AsFloat := lQuantidade;
        FDQ_Append.ParamByName('valor_total').AsFloat := LObj.GetValue<Double>('valor_total', 0);
        FDQ_Append.ParamByName('valor_unitario').AsFloat := LObj.GetValue<Double>('valor_unitario', 0);
        FDQ_Append.ParamByName('data_compra').AsDateTime := lDataCompra;
        FDQ_Append.ParamByName('observacao').AsString := Trim(LObj.GetValue<String>('observacao', ''));
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.ParamByName('usuario_cadastro').AsInteger := aUsuarioId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;

        // Update stock: delta = new_quantidade - old_quantidade
        var lDelta := lQuantidade - lOldQuantidade;
        if lDelta <> 0 then
          AtualizarEstoqueInsumo(lInsumoId, lDelta, lDataCompra, aEmpresaId, fDm.FDConnection);

        RecalcularCustoMedio(lInsumoId, aEmpresaId, fDm.FDConnection);

        // If new compra and default category is set, create contas_pagar entry
        if (lCódigo = 0) and (LObj.GetValue<Integer>('categoria_pagar_id', 0) > 0) then
        begin
          var FDQ_InsertCP: TFDQuery;
          FDQ_InsertCP := TFDQuery.Create(nil);
          try
            FDQ_InsertCP.Connection := fDm.FDConnection;

            var lPago := LObj.GetValue<Boolean>('pago', False);

            FDQ_InsertCP.SQL.Add('INSERT INTO gestor.contas_pagar ');
            FDQ_InsertCP.SQL.Add('  (usuario_id, fornecedor_id, descricao, valor, data_vencimento, id_categoria, pago, data_pagamento, lancamento_origem_id, empresa_id) ');
            FDQ_InsertCP.SQL.Add('VALUES (');
            FDQ_InsertCP.SQL.Add('  :usuario_id, :fornecedor_id, ');
            FDQ_InsertCP.SQL.Add('  (SELECT ''Compra: '' || i.nome FROM producao.insumo i WHERE i.id = :insumo_id), ');
            FDQ_InsertCP.SQL.Add('  :valor, :data_vencimento, :categoria_pagar_id, :pago, :data_pagamento, :lancamento_origem_id, :empresa_id) ');
            FDQ_InsertCP.SQL.Add('RETURNING id ');

            FDQ_InsertCP.ParamByName('usuario_id').AsInteger := aUsuarioId;
            FDQ_InsertCP.ParamByName('fornecedor_id').AsInteger := LObj.GetValue<Integer>('fornecedor_id', 0);
            FDQ_InsertCP.ParamByName('insumo_id').AsInteger := lInsumoId;
            FDQ_InsertCP.ParamByName('valor').AsFloat := LObj.GetValue<Double>('valor_total', 0);
            FDQ_InsertCP.ParamByName('data_vencimento').AsDateTime := LObj.GetValue<TDateTime>('data_vencimento', lDataCompra);
            FDQ_InsertCP.ParamByName('categoria_pagar_id').AsInteger := LObj.GetValue<Integer>('categoria_pagar_id', 0);
            FDQ_InsertCP.ParamByName('pago').AsBoolean := lPago;
            FDQ_InsertCP.ParamByName('data_pagamento').DataType := ftDate;
            if lPago then
              FDQ_InsertCP.ParamByName('data_pagamento').AsDateTime := LObj.GetValue<TDateTime>('data_pagamento', lDataCompra)
            else
              FDQ_InsertCP.ParamByName('data_pagamento').Value := Null;
            FDQ_InsertCP.ParamByName('lancamento_origem_id').AsInteger := FCódigoRetorno;
            FDQ_InsertCP.ParamByName('empresa_id').AsInteger := aEmpresaId;
            FDQ_InsertCP.Open;
          finally
            FDQ_InsertCP.Free;
          end;
        end;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Compra Insumo inserida/atualizada com sucesso');
      Result.Menssage := 'Compra Insumo Inserida/Atualizada com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.CompraInsumo_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código da Compra Insumo para excluir.';
        GravarLogJSON('uDataBase.Manager', 'CompraInsumo_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select insumo_id, quantidade, data_compra from producao.compra_insumo where id = :Id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Compra Insumo ' + aId.ToString + ' não localizada.';
        fDm.FDConnection.Rollback;
        Exit;
      end;

      var lInsumoId := FDQ_Select.FieldByName('insumo_id').AsInteger;
      var lQuantidade := FDQ_Select.FieldByName('quantidade').AsFloat;
      var lDataCompra := FDQ_Select.FieldByName('data_compra').AsDateTime;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from producao.compra_insumo where id = :Id and empresa_id = :empresa_id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.ExecSQL;

      // Subtract the deleted quantity from stock
      AtualizarEstoqueInsumo(lInsumoId, -lQuantidade, lDataCompra, aEmpresaId, fDm.FDConnection);

      RecalcularCustoMedio(lInsumoId, aEmpresaId, fDm.FDConnection);
 
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Compra Insumo ' + aId.ToString + ', excluída com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Compra Insumo ' + aId.ToString + ' excluída com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

procedure TDataBaseManager.RecalcularCustoMedio(const aInsumoId: Integer; const aEmpresaId: Integer; const aFDConnection: TFDConnection);
var
  FDQ_Calc: TFDQuery;
begin
  FDQ_Calc := TFDQuery.Create(nil);
  try
    FDQ_Calc.Connection := aFDConnection;
    FDQ_Calc.SQL.Text :=
      'UPDATE producao.insumo i ' +
      'SET custo_medio = COALESCE(( ' +
      '  SELECT SUM(ci.valor_unitario * ci.quantidade) / NULLIF(SUM(ci.quantidade), 0) ' +
      '  FROM producao.compra_insumo ci ' +
      '  WHERE ci.insumo_id = :insumo_id ' +
      '    AND ci.empresa_id = :empresa_id ' +
      '), 0) ' +
      'WHERE i.id = :insumo_id';
    FDQ_Calc.ParamByName('insumo_id').AsInteger := aInsumoId;
    FDQ_Calc.ParamByName('empresa_id').AsInteger := aEmpresaId;
    FDQ_Calc.ExecSQL;
  finally
    FDQ_Calc.Free;
  end;
end;

procedure TDataBaseManager.AtualizarEstoqueInsumo(const aInsumoId: Integer; const aDelta: Double; const aDataAtualizacao: TDateTime; const aEmpresaId: Integer; const aFDConnection: TFDConnection);
var
  FDQ_Estoque: TFDQuery;
begin
  FDQ_Estoque := TFDQuery.Create(nil);
  try
    FDQ_Estoque.Connection := aFDConnection;

    // Try to update existing record
    FDQ_Estoque.SQL.Text :=
      'UPDATE producao.estoque_insumo ' +
      'SET quantidade = quantidade + :delta, ' +
      '    data_atualizacao = :data_atualizacao ' +
      'WHERE insumo_id = :insumo_id AND empresa_id = :empresa_id';
    FDQ_Estoque.ParamByName('insumo_id').AsInteger := aInsumoId;
    FDQ_Estoque.ParamByName('delta').AsFloat := aDelta;
    FDQ_Estoque.ParamByName('data_atualizacao').AsDateTime := aDataAtualizacao;
    FDQ_Estoque.ParamByName('empresa_id').AsInteger := aEmpresaId;
    FDQ_Estoque.ExecSQL;

    // If no rows updated, insert new record
    if FDQ_Estoque.RowsAffected = 0 then
    begin
      FDQ_Estoque.SQL.Text :=
        'INSERT INTO producao.estoque_insumo (insumo_id, quantidade, data_atualizacao, empresa_id) ' +
        'VALUES (:insumo_id, :quantidade, :data_atualizacao, :empresa_id)';
      FDQ_Estoque.ParamByName('insumo_id').AsInteger := aInsumoId;
      FDQ_Estoque.ParamByName('quantidade').AsFloat := aDelta;
      FDQ_Estoque.ParamByName('data_atualizacao').AsDateTime := aDataAtualizacao;
      FDQ_Estoque.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Estoque.ExecSQL;
    end;
  finally
    FDQ_Estoque.Free;
  end;
end;

procedure TDataBaseManager.AtualizarEstoqueProdutoFabricado(const aProdutoFabricadoId: Integer; const aDelta: Double; const aDataAtualizacao: TDateTime; const aEmpresaId: Integer; const aFDConnection: TFDConnection);
var
  FDQ_Estoque: TFDQuery;
begin
  FDQ_Estoque := TFDQuery.Create(nil);
  try
    FDQ_Estoque.Connection := aFDConnection;

    FDQ_Estoque.SQL.Text :=
      'UPDATE producao.estoque_produto_fabricado ' +
      'SET quantidade = quantidade + :delta, ' +
      '    data_atualizacao = :data_atualizacao ' +
      'WHERE produto_fabricado_id = :produto_fabricado_id AND empresa_id = :empresa_id';
    FDQ_Estoque.ParamByName('produto_fabricado_id').AsInteger := aProdutoFabricadoId;
    FDQ_Estoque.ParamByName('delta').AsFloat := aDelta;
    FDQ_Estoque.ParamByName('data_atualizacao').AsDateTime := aDataAtualizacao;
    FDQ_Estoque.ParamByName('empresa_id').AsInteger := aEmpresaId;
    FDQ_Estoque.ExecSQL;

    if FDQ_Estoque.RowsAffected = 0 then
    begin
      FDQ_Estoque.SQL.Text :=
        'INSERT INTO producao.estoque_produto_fabricado (produto_fabricado_id, quantidade, data_atualizacao, empresa_id) ' +
        'VALUES (:produto_fabricado_id, :quantidade, :data_atualizacao, :empresa_id)';
      FDQ_Estoque.ParamByName('produto_fabricado_id').AsInteger := aProdutoFabricadoId;
      FDQ_Estoque.ParamByName('quantidade').AsFloat := aDelta;
      FDQ_Estoque.ParamByName('data_atualizacao').AsDateTime := aDataAtualizacao;
      FDQ_Estoque.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Estoque.ExecSQL;
    end;
  finally
    FDQ_Estoque.Free;
  end;
end;

{ Estoque Insumo }

function TDataBaseManager.EstoqueInsumo_Listar(out fJson:TJSONArray; const aId:Integer=0; const aInsumoId:Integer=0; const aEmpresaId:Integer=0): TReturn;
var
  fDm: TDM;
  FDQ_Select: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('SELECT ei.*, i.nome AS insumo_nome ');
      FDQ_Select.Sql.Add('FROM producao.estoque_insumo ei ');
      FDQ_Select.Sql.Add('LEFT JOIN producao.insumo i ON i.id = ei.insumo_id ');
      FDQ_Select.Sql.Add('WHERE 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('AND ei.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if aInsumoId > 0 then
      begin
        FDQ_Select.Sql.Add('AND ei.insumo_id = :insumo_id ');
        FDQ_Select.ParamByName('insumo_id').AsInteger := aInsumoId;
      end;
      if aEmpresaId > 0 then
      begin
        FDQ_Select.Sql.Add('AND ei.empresa_id = :estoque_empresa_id ');
        FDQ_Select.ParamByName('estoque_empresa_id').AsInteger := aEmpresaId;
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Nenhum registro de estoque insumo encontrado.';
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro ao listar estoque insumo: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.EstoqueInsumo_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno: Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size - 1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;
        var lCódigo := LObj.GetValue<Integer>('codigo', 0);
        var lInsumoId := LObj.GetValue<Integer>('insumo_id', 0);

        if lInsumoId = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Insumo não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.SQL.Add('MERGE INTO producao.estoque_insumo ei ');
        FDQ_Append.SQL.Add('USING ( ');
        FDQ_Append.SQL.Add('  SELECT ');
        FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
        FDQ_Append.SQL.Add('    ,CAST(:insumo_id AS INTEGER) AS insumo_id ');
        FDQ_Append.SQL.Add('    ,CAST(:quantidade AS NUMERIC(18,6)) AS quantidade ');
        FDQ_Append.SQL.Add('    ,CAST(:data_atualizacao AS DATE) AS data_atualizacao ');
        FDQ_Append.SQL.Add('    ,CAST(:observacao AS VARCHAR(500)) AS observacao ');
        FDQ_Append.SQL.Add('    ,CAST(:empresa_id AS INTEGER) AS empresa_id ');
        FDQ_Append.SQL.Add(') SRC ON (ei.id = SRC.id AND SRC.id > 0) ');
        FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
        FDQ_Append.SQL.Add('  UPDATE SET ');
        FDQ_Append.SQL.Add('    insumo_id = SRC.insumo_id ');
        FDQ_Append.SQL.Add('    ,quantidade = SRC.quantidade ');
        FDQ_Append.SQL.Add('    ,data_atualizacao = SRC.data_atualizacao ');
        FDQ_Append.SQL.Add('    ,observacao = SRC.observacao ');
        FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
        FDQ_Append.SQL.Add('  INSERT (insumo_id, quantidade, data_atualizacao, observacao, empresa_id) ');
        FDQ_Append.SQL.Add('  VALUES (SRC.insumo_id, SRC.quantidade, SRC.data_atualizacao, SRC.observacao, SRC.empresa_id) ');
        FDQ_Append.SQL.Add('RETURNING ei.id ');

        FDQ_Append.ParamByName('id').AsInteger := lCódigo;
        FDQ_Append.ParamByName('insumo_id').AsInteger := lInsumoId;
        FDQ_Append.ParamByName('quantidade').AsFloat := LObj.GetValue<Double>('quantidade', 0);
        FDQ_Append.ParamByName('data_atualizacao').AsDateTime := LObj.GetValue<TDateTime>('data_atualizacao', 0);
        FDQ_Append.ParamByName('observacao').AsString := Trim(LObj.GetValue<String>('observacao', ''));
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Estoque Insumo inserido/atualizado com sucesso');
      Result.Menssage := 'Estoque Insumo Inserido/Atualizado com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.EstoqueInsumo_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código para excluir.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from producao.estoque_insumo where id = :Id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Registro ' + aId.ToString + ' excluído com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Registro ' + aId.ToString + ' excluído com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Estoque Produto Fabricado }

function TDataBaseManager.EstoqueProdutoFabricado_Listar(out fJson:TJSONArray; const aId:Integer=0; const aProdutoFabricadoId:Integer=0; const aEmpresaId:Integer=0): TReturn;
var
  fDm: TDM;
  FDQ_Select: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('SELECT epf.*, pf.nome AS produto_nome ');
      FDQ_Select.Sql.Add('FROM producao.estoque_produto_fabricado epf ');
      FDQ_Select.Sql.Add('LEFT JOIN producao.produto_fabricado pf ON pf.id = epf.produto_fabricado_id ');
      FDQ_Select.Sql.Add('WHERE 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('AND epf.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if aProdutoFabricadoId > 0 then
      begin
        FDQ_Select.Sql.Add('AND epf.produto_fabricado_id = :produto_id ');
        FDQ_Select.ParamByName('produto_id').AsInteger := aProdutoFabricadoId;
      end;
      if aEmpresaId > 0 then
      begin
        FDQ_Select.Sql.Add('AND epf.empresa_id = :estprod_empresa_id ');
        FDQ_Select.ParamByName('estprod_empresa_id').AsInteger := aEmpresaId;
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Nenhum registro de estoque produto encontrado.';
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro ao listar estoque produto: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.EstoqueProdutoFabricado_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno: Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size - 1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;
        var lCódigo := LObj.GetValue<Integer>('codigo', 0);
        var lProdutoId := LObj.GetValue<Integer>('produto_fabricado_id', 0);

        if lProdutoId = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Produto não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.SQL.Add('MERGE INTO producao.estoque_produto_fabricado epf ');
        FDQ_Append.SQL.Add('USING ( ');
        FDQ_Append.SQL.Add('  SELECT ');
        FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
        FDQ_Append.SQL.Add('    ,CAST(:produto_fabricado_id AS INTEGER) AS produto_fabricado_id ');
        FDQ_Append.SQL.Add('    ,CAST(:quantidade AS NUMERIC(18,6)) AS quantidade ');
        FDQ_Append.SQL.Add('    ,CAST(:data_atualizacao AS DATE) AS data_atualizacao ');
        FDQ_Append.SQL.Add('    ,CAST(:observacao AS VARCHAR(500)) AS observacao ');
        FDQ_Append.SQL.Add('    ,CAST(:empresa_id AS INTEGER) AS empresa_id ');
        FDQ_Append.SQL.Add(') SRC ON (epf.id = SRC.id AND SRC.id > 0) ');
        FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
        FDQ_Append.SQL.Add('  UPDATE SET ');
        FDQ_Append.SQL.Add('    produto_fabricado_id = SRC.produto_fabricado_id ');
        FDQ_Append.SQL.Add('    ,quantidade = SRC.quantidade ');
        FDQ_Append.SQL.Add('    ,data_atualizacao = SRC.data_atualizacao ');
        FDQ_Append.SQL.Add('    ,observacao = SRC.observacao ');
        FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
        FDQ_Append.SQL.Add('  INSERT (produto_fabricado_id, quantidade, data_atualizacao, observacao, empresa_id) ');
        FDQ_Append.SQL.Add('  VALUES (SRC.produto_fabricado_id, SRC.quantidade, SRC.data_atualizacao, SRC.observacao, SRC.empresa_id) ');
        FDQ_Append.SQL.Add('RETURNING epf.id ');

        FDQ_Append.ParamByName('id').AsInteger := lCódigo;
        FDQ_Append.ParamByName('produto_fabricado_id').AsInteger := lProdutoId;
        FDQ_Append.ParamByName('quantidade').AsFloat := LObj.GetValue<Double>('quantidade', 0);
        FDQ_Append.ParamByName('data_atualizacao').AsDateTime := LObj.GetValue<TDateTime>('data_atualizacao', 0);
        FDQ_Append.ParamByName('observacao').AsString := Trim(LObj.GetValue<String>('observacao', ''));
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Estoque Produto inserido/atualizado com sucesso');
      Result.Menssage := 'Estoque Produto Inserido/Atualizado com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.EstoqueProdutoFabricado_Delete(out fJson:TJSONObject; const aId:Integer=0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código para excluir.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from producao.estoque_produto_fabricado where id = :Id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Registro ' + aId.ToString + ' excluído com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Registro ' + aId.ToString + ' excluído com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Produto Fabricado }

function TDataBaseManager.ProdutoFabricado_Listar(out fJson:TJSONArray; const aId:Integer=0; const aNome:String=''; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  pf.* ');
      FDQ_Select.Sql.Add('from producao.produto_fabricado pf ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and pf.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if Trim(aNome) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(pf.nome) like upper(:nome) ');
        FDQ_Select.ParamByName('nome').AsString := '%'+aNome+'%';
      end;
      FDQ_Select.Sql.Add('  and (pf.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  pf.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar os produtos fabricados.';
        GravarLogJSON('uDataBase.Manager', 'ProdutoFabricado_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.ProdutoFabricado_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if Trim(LObj.GetValue<String>('nome','')) = '' then
        begin
          Result.Id := 404;
          Result.Menssage := 'Nome do Produto Fabricado não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.SQL.Add('MERGE INTO producao.produto_fabricado pf ');
        FDQ_Append.SQL.Add('USING ( ');
        FDQ_Append.SQL.Add('  SELECT ');
        FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
        FDQ_Append.SQL.Add('    ,CAST(:nome AS VARCHAR(150)) AS nome ');
        FDQ_Append.SQL.Add('    ,CAST(:descricao AS VARCHAR(500)) AS descricao ');
        FDQ_Append.SQL.Add('    ,CAST(:rendimento AS NUMERIC(10,2)) AS rendimento ');
        FDQ_Append.SQL.Add('    ,CAST(:unidade_medida AS VARCHAR(20)) AS unidade_medida ');
        FDQ_Append.SQL.Add('    ,CAST(:custo_unitario AS NUMERIC(10,2)) AS custo_unitario ');
        FDQ_Append.SQL.Add('    ,CAST(:margem_lucro AS NUMERIC(10,2)) AS margem_lucro ');
        FDQ_Append.SQL.Add('    ,CAST(:valor_venda_sugerido AS NUMERIC(10,2)) AS valor_venda_sugerido ');
        FDQ_Append.SQL.Add('    ,CAST(:ativo AS BOOLEAN) AS ativo ');
        FDQ_Append.SQL.Add('    ,CAST(:empresa_id AS INTEGER) AS empresa_id ');
        FDQ_Append.SQL.Add(') SRC ON (pf.id = SRC.id AND SRC.id > 0) ');
        FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
        FDQ_Append.SQL.Add('  UPDATE SET ');
        FDQ_Append.SQL.Add('    nome = SRC.nome ');
        FDQ_Append.SQL.Add('    ,descricao = SRC.descricao ');
        FDQ_Append.SQL.Add('    ,rendimento = SRC.rendimento ');
        FDQ_Append.SQL.Add('    ,unidade_medida = SRC.unidade_medida ');
        FDQ_Append.SQL.Add('    ,custo_unitario = SRC.custo_unitario ');
        FDQ_Append.SQL.Add('    ,margem_lucro = SRC.margem_lucro ');
        FDQ_Append.SQL.Add('    ,valor_venda_sugerido = SRC.valor_venda_sugerido ');
        FDQ_Append.SQL.Add('    ,ativo = SRC.ativo ');
        FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
        FDQ_Append.SQL.Add('  INSERT (nome, descricao, rendimento, unidade_medida, custo_unitario, margem_lucro, valor_venda_sugerido, ativo, empresa_id) ');
        FDQ_Append.SQL.Add('  VALUES (SRC.nome, SRC.descricao, SRC.rendimento, SRC.unidade_medida, SRC.custo_unitario, SRC.margem_lucro, SRC.valor_venda_sugerido, SRC.ativo, SRC.empresa_id) ');
        FDQ_Append.SQL.Add('RETURNING pf.id ');

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('nome').AsString := Trim(LObj.GetValue<String>('nome', ''));
        FDQ_Append.ParamByName('descricao').AsString := Trim(LObj.GetValue<String>('descricao', ''));
        FDQ_Append.ParamByName('rendimento').AsFloat := LObj.GetValue<Double>('rendimento', 0);
        FDQ_Append.ParamByName('unidade_medida').AsString := Trim(LObj.GetValue<String>('unidade_medida', ''));
        FDQ_Append.ParamByName('custo_unitario').AsFloat := LObj.GetValue<Double>('custo_unitario', 0);
        FDQ_Append.ParamByName('margem_lucro').AsFloat := LObj.GetValue<Double>('margem_lucro', 0);
        FDQ_Append.ParamByName('valor_venda_sugerido').AsFloat := LObj.GetValue<Double>('valor_venda_sugerido', 0);
        FDQ_Append.ParamByName('ativo').AsBoolean := LObj.GetValue<Boolean>('ativo', True);
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Produto Fabricado inserido/atualizado com sucesso');
      Result.Menssage := 'Produto Fabricado Inserido/Atualizado com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.ProdutoFabricado_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código do Produto Fabricado para excluir.';
        GravarLogJSON('uDataBase.Manager', 'ProdutoFabricado_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      if aEmpresaId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Empresa não informada.';
        GravarLogJSON('uDataBase.Manager', 'ProdutoFabricado_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('SELECT COUNT(*) as cnt FROM producao.fabricacao WHERE produto_fabricado_id = :id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.Open;
      if FDQ_Select.FieldByName('cnt').AsInteger > 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'Não é possível excluir o produto fabricado, pois existem fabricações vinculadas a ele.';
        GravarLogJSON('uDataBase.Manager', 'ProdutoFabricado_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from producao.produto_fabricado where id = :Id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Produto Fabricado ' + aId.ToString + ', excluído com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Produto Fabricado ' + aId.ToString + ' excluído com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Receita Ingrediente }

function TDataBaseManager.ReceitaIngrediente_Listar(out fJson:TJSONArray; const aId:Integer=0; const aProdutoFabricadoId:Integer=0; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  ri.*, i.nome as insumo_nome, i.ativo as insumo_ativo ');
      FDQ_Select.Sql.Add('from producao.receita_ingrediente ri ');
      FDQ_Select.Sql.Add('join producao.insumo i on i.id = ri.insumo_id ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and ri.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if aProdutoFabricadoId > 0 then
      begin
        FDQ_Select.Sql.Add('  and ri.produto_fabricado_id = :produto_fabricado_id ');
        FDQ_Select.ParamByName('produto_fabricado_id').AsInteger := aProdutoFabricadoId;
      end;
      if aEmpresaId > 0 then
      begin
        FDQ_Select.Sql.Add('  and ri.empresa_id = :empresa_id ');
        FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      end;

      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  ri.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar os ingredientes da receita.';
        GravarLogJSON('uDataBase.Manager', 'ReceitaIngrediente_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.ReceitaIngrediente_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if LObj.GetValue<Integer>('produto_fabricado_id', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Produto Fabricado não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.SQL.Add('MERGE INTO producao.receita_ingrediente ri ');
        FDQ_Append.SQL.Add('USING ( ');
        FDQ_Append.SQL.Add('  SELECT ');
        FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
        FDQ_Append.SQL.Add('    ,CAST(:produto_fabricado_id AS INTEGER) AS produto_fabricado_id ');
        FDQ_Append.SQL.Add('    ,CAST(:insumo_id AS INTEGER) AS insumo_id ');
        FDQ_Append.SQL.Add('    ,CAST(:quantidade AS NUMERIC(18,6)) AS quantidade ');
        FDQ_Append.SQL.Add('    ,CAST(:empresa_id AS INTEGER) AS empresa_id ');
        FDQ_Append.SQL.Add(') SRC ON (ri.id = SRC.id AND SRC.id > 0) ');
        FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
        FDQ_Append.SQL.Add('  UPDATE SET ');
        FDQ_Append.SQL.Add('    produto_fabricado_id = SRC.produto_fabricado_id ');
        FDQ_Append.SQL.Add('    ,insumo_id = SRC.insumo_id ');
        FDQ_Append.SQL.Add('    ,quantidade = SRC.quantidade ');
        FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
        FDQ_Append.SQL.Add('  INSERT (produto_fabricado_id, insumo_id, quantidade, empresa_id) ');
        FDQ_Append.SQL.Add('  VALUES (SRC.produto_fabricado_id, SRC.insumo_id, SRC.quantidade, SRC.empresa_id) ');
        FDQ_Append.SQL.Add('RETURNING ri.id ');

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('produto_fabricado_id').AsInteger := LObj.GetValue<Integer>('produto_fabricado_id', 0);
        FDQ_Append.ParamByName('insumo_id').AsInteger := LObj.GetValue<Integer>('insumo_id', 0);
        FDQ_Append.ParamByName('quantidade').AsFloat := LObj.GetValue<Double>('quantidade', 0);
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Receita Ingrediente inserido/atualizado com sucesso');
      Result.Menssage := 'Receita Ingrediente Inserido/Atualizado com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.ReceitaIngrediente_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código do Receita Ingrediente para excluir.';
        GravarLogJSON('uDataBase.Manager', 'ReceitaIngrediente_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from producao.receita_ingrediente where id = :Id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Receita Ingrediente ' + aId.ToString + ', excluído com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Receita Ingrediente ' + aId.ToString + ' excluído com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Custo Adicional Tipo }

function TDataBaseManager.CustoAdicionalTipo_Listar(out fJson:TJSONArray; const aId:Integer=0; const aNome:String=''; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  cat.* ');
      FDQ_Select.Sql.Add('from producao.custo_adicional_tipo cat ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and cat.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if Trim(aNome) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(cat.nome) like upper(:nome) ');
        FDQ_Select.ParamByName('nome').AsString := '%'+aNome+'%';
      end;
      FDQ_Select.Sql.Add('  and (cat.empresa_id = :empresa_id or :empresa_id = 0) ');
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  cat.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar os tipos de custo adicional.';
        GravarLogJSON('uDataBase.Manager', 'CustoAdicionalTipo_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.CustoAdicionalTipo_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno :Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if Trim(LObj.GetValue<String>('nome','')) = '' then
        begin
          Result.Id := 404;
          Result.Menssage := 'Nome do Custo Adicional Tipo não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.SQL.Add('MERGE INTO producao.custo_adicional_tipo cat ');
        FDQ_Append.SQL.Add('USING ( ');
        FDQ_Append.SQL.Add('  SELECT ');
        FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
        FDQ_Append.SQL.Add('    ,CAST(:nome AS VARCHAR(100)) AS nome ');
        FDQ_Append.SQL.Add('    ,CAST(:ativo AS BOOLEAN) AS ativo ');
        FDQ_Append.SQL.Add('    ,CAST(:empresa_id AS INTEGER) AS empresa_id ');
        FDQ_Append.SQL.Add(') SRC ON (cat.id = SRC.id AND SRC.id > 0) ');
        FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
        FDQ_Append.SQL.Add('  UPDATE SET ');
        FDQ_Append.SQL.Add('    nome = SRC.nome ');
        FDQ_Append.SQL.Add('    ,ativo = SRC.ativo ');
        FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
        FDQ_Append.SQL.Add('  INSERT (nome, ativo, empresa_id) ');
        FDQ_Append.SQL.Add('  VALUES (SRC.nome, SRC.ativo, SRC.empresa_id) ');
        FDQ_Append.SQL.Add('RETURNING cat.id ');

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('nome').AsString := Trim(LObj.GetValue<String>('nome', ''));
        FDQ_Append.ParamByName('ativo').AsBoolean := LObj.GetValue<Boolean>('ativo', True);
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Custo Adicional Tipo inserido/atualizado com sucesso');
      Result.Menssage := 'Custo Adicional Tipo Inserido/Atualizado com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.CustoAdicionalTipo_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código do Custo Adicional Tipo para excluir.';
        GravarLogJSON('uDataBase.Manager', 'CustoAdicionalTipo_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from producao.custo_adicional_tipo where id = :Id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Custo Adicional Tipo ' + aId.ToString + ', excluído com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Custo Adicional Tipo ' + aId.ToString + ' excluído com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Fabricacao }

function TDataBaseManager.Fabricacao_Listar(out fJson:TJSONArray; const aId:Integer=0; const aProdutoFabricadoId:Integer=0; const aDataInicial:TDateTime=0; const aDataFinal:TDateTime=0; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  f.*, pf.nome as produto_nome ');
      FDQ_Select.Sql.Add('from producao.fabricacao f ');
      FDQ_Select.Sql.Add('left join producao.produto_fabricado pf on pf.id = f.produto_fabricado_id ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and f.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if aProdutoFabricadoId > 0 then
      begin
        FDQ_Select.Sql.Add('  and f.produto_fabricado_id = :produto_fabricado_id ');
        FDQ_Select.ParamByName('produto_fabricado_id').AsInteger := aProdutoFabricadoId;
      end;
      if aEmpresaId > 0 then
      begin
        FDQ_Select.Sql.Add('  and f.empresa_id = :empresa_id ');
        FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      end;
      if (aDataInicial > 0) and (aDataFinal > 0) then
      begin
        FDQ_Select.Sql.Add('  and f.data_fabricacao between :dataInicial and :dataFinal ');
        FDQ_Select.ParamByName('dataInicial').AsDateTime := aDataInicial;
        FDQ_Select.ParamByName('dataFinal').AsDateTime := aDataFinal;
      end;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  f.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar as fabricações.';
        GravarLogJSON('uDataBase.Manager', 'Fabricacao_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Fabricacao_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FDQ_Aux: TFDQuery;
  FCódigoRetorno :Integer;
  fCustoInsumos: Double;
  fCustoTotal: Double;
  fCustoUnitario: Double;
  fProdutoFabricadoId: Integer;
  fQuantidadeProduzida: Double;
  fCustoAdicionalTotal: Double;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;
  FDQ_Aux := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;
      FDQ_Aux := TFDQuery.Create(nil);
      FDQ_Aux.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if LObj.GetValue<Integer>('produto_fabricado_id', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Produto Fabricado não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        fProdutoFabricadoId := LObj.GetValue<Integer>('produto_fabricado_id', 0);
        fQuantidadeProduzida := LObj.GetValue<Double>('quantidade_produzida', 0);

        var lCódigo := LObj.GetValue<Integer>('codigo', 0);
        if lCódigo > 0 then
        begin
          FDQ_Aux.Close;
          FDQ_Aux.Sql.Clear;
          FDQ_Aux.Sql.Add('SELECT COALESCE(SUM(valor), 0) FROM producao.fabricacao_custo_adicional WHERE fabricacao_id = :fabricacao_id');
          FDQ_Aux.ParamByName('fabricacao_id').AsInteger := lCódigo;
          FDQ_Aux.Open;
          fCustoAdicionalTotal := FDQ_Aux.Fields[0].AsFloat;
        end
        else
          fCustoAdicionalTotal := 0;

        // Calculate custo_insumos from receita_ingrediente * insumo.custo_medio
        FDQ_Aux.Close;
        FDQ_Aux.Sql.Clear;
        FDQ_Aux.Sql.Add('SELECT COALESCE(SUM(ri.quantidade * i.custo_medio), 0) AS custo_insumos ');
        FDQ_Aux.Sql.Add('FROM producao.receita_ingrediente ri ');
        FDQ_Aux.Sql.Add('JOIN producao.insumo i ON i.id = ri.insumo_id ');
        FDQ_Aux.Sql.Add('WHERE ri.produto_fabricado_id = :produto_fabricado_id ');
        FDQ_Aux.ParamByName('produto_fabricado_id').AsInteger := fProdutoFabricadoId;
        FDQ_Aux.Open;
        fCustoInsumos := FDQ_Aux.Fields[0].AsFloat;

        fCustoTotal := fCustoInsumos + fCustoAdicionalTotal;
        if fQuantidadeProduzida > 0 then
          fCustoUnitario := fCustoTotal / fQuantidadeProduzida
        else
          fCustoUnitario := 0;

        FDQ_Append.SQL.Add('MERGE INTO producao.fabricacao f ');
        FDQ_Append.SQL.Add('USING ( ');
        FDQ_Append.SQL.Add('  SELECT ');
        FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
        FDQ_Append.SQL.Add('    ,CAST(:produto_fabricado_id AS INTEGER) AS produto_fabricado_id ');
        FDQ_Append.SQL.Add('    ,CAST(:quantidade_produzida AS NUMERIC(10,2)) AS quantidade_produzida ');
        FDQ_Append.SQL.Add('    ,CAST(:data_fabricacao AS DATE) AS data_fabricacao ');
        FDQ_Append.SQL.Add('    ,CAST(:custo_insumos AS NUMERIC(10,2)) AS custo_insumos ');
        FDQ_Append.SQL.Add('    ,CAST(:custo_adicional_total AS NUMERIC(10,2)) AS custo_adicional_total ');
        FDQ_Append.SQL.Add('    ,CAST(:custo_total AS NUMERIC(10,2)) AS custo_total ');
        FDQ_Append.SQL.Add('    ,CAST(:custo_unitario AS NUMERIC(10,2)) AS custo_unitario ');
        FDQ_Append.SQL.Add('    ,CAST(:observacao AS VARCHAR(500)) AS observacao ');
        FDQ_Append.SQL.Add('    ,CAST(:empresa_id AS INTEGER) AS empresa_id ');
        FDQ_Append.SQL.Add(') SRC ON (f.id = SRC.id AND SRC.id > 0) ');
        FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
        FDQ_Append.SQL.Add('  UPDATE SET ');
        FDQ_Append.SQL.Add('    produto_fabricado_id = SRC.produto_fabricado_id ');
        FDQ_Append.SQL.Add('    ,quantidade_produzida = SRC.quantidade_produzida ');
        FDQ_Append.SQL.Add('    ,data_fabricacao = SRC.data_fabricacao ');
        FDQ_Append.SQL.Add('    ,custo_insumos = SRC.custo_insumos ');
        FDQ_Append.SQL.Add('    ,custo_adicional_total = SRC.custo_adicional_total ');
        FDQ_Append.SQL.Add('    ,custo_total = SRC.custo_total ');
        FDQ_Append.SQL.Add('    ,custo_unitario = SRC.custo_unitario ');
        FDQ_Append.SQL.Add('    ,observacao = SRC.observacao ');
        FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
        FDQ_Append.SQL.Add('  INSERT (produto_fabricado_id, quantidade_produzida, data_fabricacao, custo_insumos, custo_adicional_total, custo_total, custo_unitario, observacao, empresa_id) ');
        FDQ_Append.SQL.Add('  VALUES (SRC.produto_fabricado_id, SRC.quantidade_produzida, SRC.data_fabricacao, SRC.custo_insumos, SRC.custo_adicional_total, SRC.custo_total, SRC.custo_unitario, SRC.observacao, SRC.empresa_id) ');
        FDQ_Append.SQL.Add('RETURNING f.id ');

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('produto_fabricado_id').AsInteger := fProdutoFabricadoId;
        FDQ_Append.ParamByName('quantidade_produzida').AsFloat := fQuantidadeProduzida;
        FDQ_Append.ParamByName('data_fabricacao').AsDateTime := LObj.GetValue<TDateTime>('data_fabricacao', 0);
        FDQ_Append.ParamByName('custo_insumos').AsFloat := fCustoInsumos;
        FDQ_Append.ParamByName('custo_adicional_total').AsFloat := fCustoAdicionalTotal;
        FDQ_Append.ParamByName('custo_total').AsFloat := fCustoTotal;
        FDQ_Append.ParamByName('custo_unitario').AsFloat := fCustoUnitario;
        FDQ_Append.ParamByName('observacao').AsString := Trim(LObj.GetValue<String>('observacao', ''));
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;

        // Atualizar estoque apenas para novas fabricações
        if lCódigo = 0 then
        begin
          var fDataFabricacao := LObj.GetValue<TDateTime>('data_fabricacao', 0);

          // Subtrair insumos usados na receita
          FDQ_Aux.Close;
          FDQ_Aux.Sql.Clear;
          FDQ_Aux.Sql.Add('SELECT ri.insumo_id, ri.quantidade ');
          FDQ_Aux.Sql.Add('FROM producao.receita_ingrediente ri ');
          FDQ_Aux.Sql.Add('WHERE ri.produto_fabricado_id = :produto_fabricado_id ');
          FDQ_Aux.ParamByName('produto_fabricado_id').AsInteger := fProdutoFabricadoId;
          FDQ_Aux.Open;

          while not FDQ_Aux.Eof do
          begin
            var lInsumoId := FDQ_Aux.FieldByName('insumo_id').AsInteger;
            var lQuantidade := FDQ_Aux.FieldByName('quantidade').AsFloat;
            AtualizarEstoqueInsumo(lInsumoId, -lQuantidade, fDataFabricacao, aEmpresaId, fDm.FDConnection);
            FDQ_Aux.Next;
          end;

          // Adicionar produto fabricado ao estoque
          AtualizarEstoqueProdutoFabricado(fProdutoFabricadoId, fQuantidadeProduzida, fDataFabricacao, aEmpresaId, fDm.FDConnection);
        end;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Fabricação inserida/atualizada com sucesso');
      Result.Menssage := 'Fabricação Inserida/Atualizada com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Aux) then
      FDQ_Aux.Free;
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Fabricacao_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código da Fabricação para excluir.';
        GravarLogJSON('uDataBase.Manager', 'Fabricacao_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from producao.fabricacao where id = :Id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Fabricação ' + aId.ToString + ', excluída com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Fabricação ' + aId.ToString + ' excluída com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Fabricacao Custo Adicional }

function TDataBaseManager.FabricacaoCustoAdicional_Listar(out fJson:TJSONArray; const aFabricacaoId:Integer=0; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  fca.*, cat.nome as custo_adicional_nome ');
      FDQ_Select.Sql.Add('from producao.fabricacao_custo_adicional fca ');
      FDQ_Select.Sql.Add('join producao.custo_adicional_tipo cat on cat.id = fca.custo_adicional_tipo_id ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aFabricacaoId > 0 then
      begin
        FDQ_Select.Sql.Add('  and fca.fabricacao_id = :fabricacao_id ');
        FDQ_Select.ParamByName('fabricacao_id').AsInteger := aFabricacaoId;
      end;
      if aEmpresaId > 0 then
      begin
        FDQ_Select.Sql.Add('  and fca.empresa_id = :empresa_id ');
        FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      end;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  fca.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar os custos adicionais da fabricação.';
        GravarLogJSON('uDataBase.Manager', 'FabricacaoCustoAdicional_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.FabricacaoCustoAdicional_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FDQ_Aux: TFDQuery;
  FCódigoRetorno: Integer;
  fFabricacaoId: Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;
  FDQ_Aux := nil;
  fFabricacaoId := 0;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;
      FDQ_Aux := TFDQuery.Create(nil);
      FDQ_Aux.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if LObj.GetValue<Integer>('fabricacao_id', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Fabricação não informada.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        if LObj.GetValue<Integer>('custo_adicional_tipo_id', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Tipo de Custo Adicional não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        fFabricacaoId := LObj.GetValue<Integer>('fabricacao_id', 0);

        FDQ_Append.SQL.Add('MERGE INTO producao.fabricacao_custo_adicional fca ');
        FDQ_Append.SQL.Add('USING ( ');
        FDQ_Append.SQL.Add('  SELECT ');
        FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
        FDQ_Append.SQL.Add('    ,CAST(:fabricacao_id AS INTEGER) AS fabricacao_id ');
        FDQ_Append.SQL.Add('    ,CAST(:custo_adicional_tipo_id AS INTEGER) AS custo_adicional_tipo_id ');
        FDQ_Append.SQL.Add('    ,CAST(:valor AS NUMERIC(10,2)) AS valor ');
        FDQ_Append.SQL.Add('    ,CAST(:empresa_id AS INTEGER) AS empresa_id ');
        FDQ_Append.SQL.Add(') SRC ON (fca.id = SRC.id AND SRC.id > 0) ');
        FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
        FDQ_Append.SQL.Add('  UPDATE SET ');
        FDQ_Append.SQL.Add('    fabricacao_id = SRC.fabricacao_id ');
        FDQ_Append.SQL.Add('    ,custo_adicional_tipo_id = SRC.custo_adicional_tipo_id ');
        FDQ_Append.SQL.Add('    ,valor = SRC.valor ');
        FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
        FDQ_Append.SQL.Add('  INSERT (fabricacao_id, custo_adicional_tipo_id, valor, empresa_id) ');
        FDQ_Append.SQL.Add('  VALUES (SRC.fabricacao_id, SRC.custo_adicional_tipo_id, SRC.valor, SRC.empresa_id) ');
        FDQ_Append.SQL.Add('RETURNING fca.id ');

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('fabricacao_id').AsInteger := fFabricacaoId;
        FDQ_Append.ParamByName('custo_adicional_tipo_id').AsInteger := LObj.GetValue<Integer>('custo_adicional_tipo_id', 0);
        FDQ_Append.ParamByName('valor').AsFloat := LObj.GetValue<Double>('valor', 0);
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      if fFabricacaoId > 0 then
      begin
        FDQ_Aux.Close;
        FDQ_Aux.Sql.Clear;
        FDQ_Aux.Sql.Add('UPDATE producao.fabricacao f SET ');
        FDQ_Aux.Sql.Add('  custo_adicional_total = COALESCE((');
        FDQ_Aux.Sql.Add('    SELECT SUM(fca.valor) FROM producao.fabricacao_custo_adicional fca ');
        FDQ_Aux.Sql.Add('    WHERE fca.fabricacao_id = :fabricacao_id');
        FDQ_Aux.Sql.Add('  ), 0),');
        FDQ_Aux.Sql.Add('  custo_total = f.custo_insumos + COALESCE((');
        FDQ_Aux.Sql.Add('    SELECT SUM(fca.valor) FROM producao.fabricacao_custo_adicional fca ');
        FDQ_Aux.Sql.Add('    WHERE fca.fabricacao_id = :fabricacao_id');
        FDQ_Aux.Sql.Add('  ), 0),');
        FDQ_Aux.Sql.Add('  custo_unitario = (f.custo_insumos + COALESCE((');
        FDQ_Aux.Sql.Add('    SELECT SUM(fca.valor) FROM producao.fabricacao_custo_adicional fca ');
        FDQ_Aux.Sql.Add('    WHERE fca.fabricacao_id = :fabricacao_id');
        FDQ_Aux.Sql.Add('  ), 0)) / NULLIF(f.quantidade_produzida, 0)');
        FDQ_Aux.Sql.Add('WHERE f.id = :fabricacao_id');
        FDQ_Aux.ParamByName('fabricacao_id').AsInteger := fFabricacaoId;
        FDQ_Aux.ExecSQL;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Custo Adicional da Fabricação inserido/atualizado com sucesso');
      Result.Menssage := 'Custo Adicional da Fabricação Inserido/Atualizado com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Aux) then
      FDQ_Aux.Free;
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.FabricacaoCustoAdicional_Delete(out fJson:TJSONObject; const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
  fFabricacaoId: Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código do Custo Adicional da Fabricação para excluir.';
        GravarLogJSON('uDataBase.Manager', 'FabricacaoCustoAdicional_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select fabricacao_id from producao.fabricacao_custo_adicional where id = :Id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Custo Adicional da Fabricação não encontrado.';
        fDm.FDConnection.Rollback;
        Exit;
      end;

      fFabricacaoId := FDQ_Select.Fields[0].AsInteger;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from producao.fabricacao_custo_adicional where id = :Id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ExecSQL;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('UPDATE producao.fabricacao f SET ');
      FDQ_Select.Sql.Add('  custo_adicional_total = COALESCE((');
      FDQ_Select.Sql.Add('    SELECT SUM(fca.valor) FROM producao.fabricacao_custo_adicional fca ');
      FDQ_Select.Sql.Add('    WHERE fca.fabricacao_id = :fabricacao_id');
      FDQ_Select.Sql.Add('  ), 0),');
      FDQ_Select.Sql.Add('  custo_total = f.custo_insumos + COALESCE((');
      FDQ_Select.Sql.Add('    SELECT SUM(fca.valor) FROM producao.fabricacao_custo_adicional fca ');
      FDQ_Select.Sql.Add('    WHERE fca.fabricacao_id = :fabricacao_id');
      FDQ_Select.Sql.Add('  ), 0),');
      FDQ_Select.Sql.Add('  custo_unitario = (f.custo_insumos + COALESCE((');
      FDQ_Select.Sql.Add('    SELECT SUM(fca.valor) FROM producao.fabricacao_custo_adicional fca ');
      FDQ_Select.Sql.Add('    WHERE fca.fabricacao_id = :fabricacao_id');
      FDQ_Select.Sql.Add('  ), 0)) / NULLIF(f.quantidade_produzida, 0)');
      FDQ_Select.Sql.Add('WHERE f.id = :fabricacao_id');
      FDQ_Select.ParamByName('fabricacao_id').AsInteger := fFabricacaoId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Custo Adicional da Fabricação ' + aId.ToString + ', excluído com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Custo Adicional da Fabricação ' + aId.ToString + ' excluído com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Venda Produto }

function TDataBaseManager.VendaProduto_Listar(out fJson:TJSONArray; const aId:Integer=0; const aProdutoFabricadoId:Integer=0; const aClienteId:Integer=0; const aDataInicial:TDateTime=0; const aDataFinal:TDateTime=0; const APagina:Integer=0; const APaginas:Integer=0; const aEmpresaId:Integer=0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ');
      FDQ_Select.Sql.Add('  vp.*, pf.nome as produto_nome, c.nome as cliente_nome ');
      FDQ_Select.Sql.Add('from producao.venda_produto vp ');
      FDQ_Select.Sql.Add('left join producao.produto_fabricado pf on pf.id = vp.produto_fabricado_id ');
      FDQ_Select.Sql.Add('left join public.cliente c on c.id = vp.cliente_id ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and vp.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if aProdutoFabricadoId > 0 then
      begin
        FDQ_Select.Sql.Add('  and vp.produto_fabricado_id = :produto_fabricado_id ');
        FDQ_Select.ParamByName('produto_fabricado_id').AsInteger := aProdutoFabricadoId;
      end;
      if aClienteId > 0 then
      begin
        FDQ_Select.Sql.Add('  and vp.cliente_id = :cliente_id ');
        FDQ_Select.ParamByName('cliente_id').AsInteger := aClienteId;
      end;
      if (aDataInicial > 0) and (aDataFinal > 0) then
      begin
        FDQ_Select.Sql.Add('  and vp.data_venda between :dataInicial and :dataFinal ');
        FDQ_Select.ParamByName('dataInicial').AsDateTime := aDataInicial;
        FDQ_Select.ParamByName('dataFinal').AsDateTime := aDataFinal;
      end;
      if aEmpresaId > 0 then
      begin
        FDQ_Select.Sql.Add('  and vp.empresa_id = :venda_empresa_id ');
        FDQ_Select.ParamByName('venda_empresa_id').AsInteger := aEmpresaId;
      end;
      FDQ_Select.Sql.Add('order by ');
      FDQ_Select.Sql.Add('  vp.id; ');

      if ((APagina > 0) and (FPaginas > 0))  then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possível localizar as vendas de produto.';
        GravarLogJSON('uDataBase.Manager', 'VendaProduto_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.VendaProduto_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FDQ_InsertCR: TFDQuery;
  FCódigoRetorno :Integer;
  fContasReceberId: Integer;
  fCódigo: Integer;
  fUserId: Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;
  FDQ_InsertCR := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;
      FDQ_InsertCR := TFDQuery.Create(nil);
      FDQ_InsertCR.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size -1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if LObj.GetValue<Integer>('produto_fabricado_id', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Produto Fabricado não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        if LObj.GetValue<Integer>('cliente_id', 0) = 0 then
        begin
          Result.Id := 404;
          Result.Menssage := 'Cliente não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        fCódigo := LObj.GetValue<Integer>('codigo', 0);
        fUserId := aUsuarioId;
        if fUserId = 0 then
          fUserId := LObj.GetValue<Integer>('usuario_id', 0);

        FDQ_Append.SQL.Add('MERGE INTO producao.venda_produto vp ');
        FDQ_Append.SQL.Add('USING ( ');
        FDQ_Append.SQL.Add('  SELECT ');
        FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
        FDQ_Append.SQL.Add('    ,CAST(:produto_fabricado_id AS INTEGER) AS produto_fabricado_id ');
        FDQ_Append.SQL.Add('    ,CAST(:cliente_id AS INTEGER) AS cliente_id ');
        FDQ_Append.SQL.Add('    ,CAST(:usuario_id AS INTEGER) AS usuario_id ');
        FDQ_Append.SQL.Add('    ,CAST(:quantidade AS NUMERIC(10,2)) AS quantidade ');
        FDQ_Append.SQL.Add('    ,CAST(:valor_unitario AS NUMERIC(10,2)) AS valor_unitario ');
        FDQ_Append.SQL.Add('    ,CAST(:valor_total AS NUMERIC(10,2)) AS valor_total ');
        FDQ_Append.SQL.Add('    ,CAST(:data_venda AS DATE) AS data_venda ');
        FDQ_Append.SQL.Add('    ,CAST(:observacao AS VARCHAR(500)) AS observacao ');
        FDQ_Append.SQL.Add('    ,CAST(:empresa_id AS INTEGER) AS empresa_id ');
        FDQ_Append.SQL.Add(') SRC ON (vp.id = SRC.id AND SRC.id > 0) ');
        FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
        FDQ_Append.SQL.Add('  UPDATE SET ');
        FDQ_Append.SQL.Add('    produto_fabricado_id = SRC.produto_fabricado_id ');
        FDQ_Append.SQL.Add('    ,cliente_id = SRC.cliente_id ');
        FDQ_Append.SQL.Add('    ,usuario_id = SRC.usuario_id ');
        FDQ_Append.SQL.Add('    ,quantidade = SRC.quantidade ');
        FDQ_Append.SQL.Add('    ,valor_unitario = SRC.valor_unitario ');
        FDQ_Append.SQL.Add('    ,valor_total = SRC.valor_total ');
        FDQ_Append.SQL.Add('    ,data_venda = SRC.data_venda ');
        FDQ_Append.SQL.Add('    ,observacao = SRC.observacao ');
        FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
        FDQ_Append.SQL.Add('  INSERT (produto_fabricado_id, cliente_id, usuario_id, quantidade, valor_unitario, valor_total, data_venda, observacao, empresa_id) ');
        FDQ_Append.SQL.Add('  VALUES (SRC.produto_fabricado_id, SRC.cliente_id, SRC.usuario_id, SRC.quantidade, SRC.valor_unitario, SRC.valor_total, SRC.data_venda, SRC.observacao, SRC.empresa_id) ');
        FDQ_Append.SQL.Add('RETURNING vp.id ');

        FDQ_Append.ParamByName('id').AsInteger := fCódigo;
        FDQ_Append.ParamByName('produto_fabricado_id').AsInteger := LObj.GetValue<Integer>('produto_fabricado_id', 0);
        FDQ_Append.ParamByName('cliente_id').AsInteger := LObj.GetValue<Integer>('cliente_id', 0);
        FDQ_Append.ParamByName('usuario_id').AsInteger := fUserId;
        FDQ_Append.ParamByName('quantidade').AsFloat := LObj.GetValue<Double>('quantidade', 0);
        FDQ_Append.ParamByName('valor_unitario').AsFloat := LObj.GetValue<Double>('valor_unitario', 0);
        FDQ_Append.ParamByName('valor_total').AsFloat := LObj.GetValue<Double>('valor_total', 0);
        FDQ_Append.ParamByName('data_venda').AsDateTime := LObj.GetValue<TDateTime>('data_venda', 0);
        FDQ_Append.ParamByName('observacao').AsString := Trim(LObj.GetValue<String>('observacao', ''));
        FDQ_Append.ParamByName('empresa_id').AsInteger := aEmpresaId;
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
        begin
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;

          // If new sale (no codigo provided), create contas_receber entry and update stock
          if fCódigo = 0 then
          begin
            // Dar baixa no estoque do produto fabricado
            var lQuantidade := LObj.GetValue<Double>('quantidade', 0);
            var lDataVenda := LObj.GetValue<TDateTime>('data_venda', 0);
            var lProdutoFabricadoId := LObj.GetValue<Integer>('produto_fabricado_id', 0);
            AtualizarEstoqueProdutoFabricado(lProdutoFabricadoId, -lQuantidade, lDataVenda, aEmpresaId, fDm.FDConnection);

            FDQ_InsertCR.Close;
            FDQ_InsertCR.Sql.Clear;

            var lCategoriaReceberId := LObj.GetValue<Integer>('categoria_receber_id', 0);

            FDQ_InsertCR.Sql.Add('INSERT INTO gestor.contas_receber ');
            FDQ_InsertCR.Sql.Add('  (usuario_id, cliente_id, descricao, valor, data_vencimento');
            if lCategoriaReceberId > 0 then
              FDQ_InsertCR.Sql.Add(', id_categoria');
            FDQ_InsertCR.Sql.Add(', recebido, data_recebimento');
            FDQ_InsertCR.Sql.Add(', lancamento_origem_id, empresa_id) ');
            FDQ_InsertCR.Sql.Add('VALUES ( ');
            FDQ_InsertCR.Sql.Add('  :usuario_id, :cliente_id, ');
            FDQ_InsertCR.Sql.Add('  (SELECT ''Venda: '' || pf.nome || '' x '' || :quantidade_str FROM producao.produto_fabricado pf WHERE pf.id = :pf_id), ');
            FDQ_InsertCR.Sql.Add('  :valor, :data_vencimento');
            if lCategoriaReceberId > 0 then
              FDQ_InsertCR.Sql.Add(', :categoria_receber_id');
            FDQ_InsertCR.Sql.Add(', :recebido, :data_recebimento');
            FDQ_InsertCR.Sql.Add(', :lancamento_origem_id, :empresa_id) ');
            FDQ_InsertCR.Sql.Add('RETURNING id ');

            var lRecebido := LObj.GetValue<Boolean>('recebido', False);

            FDQ_InsertCR.ParamByName('usuario_id').AsInteger := fUserId;
            FDQ_InsertCR.ParamByName('cliente_id').AsInteger := LObj.GetValue<Integer>('cliente_id', 0);
            FDQ_InsertCR.ParamByName('quantidade_str').AsString := LObj.GetValue<String>('quantidade', '0');
            FDQ_InsertCR.ParamByName('pf_id').AsInteger := LObj.GetValue<Integer>('produto_fabricado_id', 0);
            FDQ_InsertCR.ParamByName('valor').AsFloat := LObj.GetValue<Double>('valor_total', 0);
            FDQ_InsertCR.ParamByName('data_vencimento').AsDateTime := LObj.GetValue<TDateTime>('data_vencimento', LObj.GetValue<TDateTime>('data_venda', 0));
            FDQ_InsertCR.ParamByName('recebido').AsBoolean := lRecebido;
            FDQ_InsertCR.ParamByName('data_recebimento').DataType := ftDate;
            if lRecebido then
              FDQ_InsertCR.ParamByName('data_recebimento').AsDateTime := LObj.GetValue<TDateTime>('data_recebimento', LObj.GetValue<TDateTime>('data_venda', 0))
            else
              FDQ_InsertCR.ParamByName('data_recebimento').Value := Null;
            if lCategoriaReceberId > 0 then
              FDQ_InsertCR.ParamByName('categoria_receber_id').AsInteger := lCategoriaReceberId;
            FDQ_InsertCR.ParamByName('lancamento_origem_id').AsInteger := FCódigoRetorno;
            FDQ_InsertCR.ParamByName('empresa_id').AsInteger := aEmpresaId;
            FDQ_InsertCR.Open;

            if not FDQ_InsertCR.IsEmpty then
            begin
              fContasReceberId := FDQ_InsertCR.Fields[0].AsInteger;

              // Update venda_produto.contas_receber_id
              FDQ_InsertCR.Close;
              FDQ_InsertCR.Sql.Clear;
              FDQ_InsertCR.Sql.Add('UPDATE producao.venda_produto SET contas_receber_id = :cr_id WHERE id = :vp_id ');
              FDQ_InsertCR.ParamByName('cr_id').AsInteger := fContasReceberId;
              FDQ_InsertCR.ParamByName('vp_id').AsInteger := FCódigoRetorno;
              FDQ_InsertCR.ExecSQL;
            end;
          end;
        end;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('contas_receber_id', TJSONNumber.Create(fContasReceberId));
      Result.JSonObject.AddPair('mensagem', 'Venda Produto inserida/atualizada com sucesso');
      Result.Menssage := 'Venda Produto Inserida/Atualizada com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_InsertCR) then
      FDQ_InsertCR.Free;
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.VendaProduto_Delete(out fJson:TJSONObject;const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Select :TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o código da Venda Produto para excluir.';
        GravarLogJSON('uDataBase.Manager', 'VendaProduto_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from producao.venda_produto where id = :Id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Venda Produto ' + aId.ToString + ', excluída com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Venda Produto ' + aId.ToString + ' excluída com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parâmetros inválidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Modulo }

function TDataBaseManager.Modulo_Listar(out fJson: TJSONArray; const aId: Integer; const aNome: String; const APagina: Integer; const APaginas: Integer; const aEmpresaId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Select: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      var fPagina := 0;
      var fPaginas := APaginas;

      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select m.* from public.modulo m where 1=1 ');
      if aId > 0 then
      begin
        FDQ_Select.Sql.Add('  and m.id = :id ');
        FDQ_Select.ParamByName('id').AsInteger := aId;
      end;
      if Trim(aNome) <> '' then
      begin
        FDQ_Select.Sql.Add('  and upper(m.nome) like upper(:nome) ');
        FDQ_Select.ParamByName('nome').AsString := '%' + aNome + '%';
      end;
      if aEmpresaId > 0 then
      begin
        FDQ_Select.Sql.Add('  and m.id in (select em.modulo_id from public.empresa_modulo em where em.empresa_id = :mod_empresa_id) ');
        FDQ_Select.ParamByName('mod_empresa_id').AsInteger := aEmpresaId;
      end;
      FDQ_Select.Sql.Add('order by m.id; ');

      if ((APagina > 0) and (FPaginas > 0)) then
      begin
        FPagina := (((APagina - 1) * FPaginas) + 1);
        FPaginas := (APagina * FPaginas);
        FDQ_Select.Sql.Add('ROWS ' + FPagina.ToString + ' TO ' + FPaginas.ToString);
      end;
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Não foi possivel localizar os modulos.';
        GravarLogJSON('uDataBase.Manager', 'Modulo_Listar', 'uDataBase.Manager', Exception.Create(Result.Menssage));
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parametros invalidos: ' + E.Message;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Modulo_Atualizar(const aJSon: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Append: TFDQuery;
  FCódigoRetorno: Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Append := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Append := TFDQuery.Create(nil);
      FDQ_Append.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if AJSon.Size = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'JSon não informado.';
        Exit;
      end;

      fDm.FDConnection.StartTransaction;
      for var I := 0 to AJSon.Size - 1 do
      begin
        var LObj := AJSon.Items[I] as TJSONObject;

        if Trim(LObj.GetValue<String>('nome', '')) = '' then
        begin
          Result.Id := 404;
          Result.Menssage := 'Nome do Modulo não informado.';
          fDm.FDConnection.Rollback;
          Exit;
        end;

        FDQ_Append.SQL.Add('MERGE INTO public.modulo m ');
        FDQ_Append.SQL.Add('USING ( ');
        FDQ_Append.SQL.Add('  SELECT ');
        FDQ_Append.SQL.Add('    CAST(:id AS INTEGER) AS id ');
        FDQ_Append.SQL.Add('    ,CAST(:nome AS VARCHAR(255)) AS nome ');
        FDQ_Append.SQL.Add('    ,CAST(:descricao AS TEXT) AS descricao ');
        FDQ_Append.SQL.Add(') SRC ON (m.id = SRC.id AND SRC.id > 0) ');
        FDQ_Append.SQL.Add('WHEN MATCHED THEN ');
        FDQ_Append.SQL.Add('  UPDATE SET ');
        FDQ_Append.SQL.Add('    nome = SRC.nome ');
        FDQ_Append.SQL.Add('    ,descricao = SRC.descricao ');
        FDQ_Append.SQL.Add('WHEN NOT MATCHED THEN ');
        FDQ_Append.SQL.Add('  INSERT (nome, descricao) ');
        FDQ_Append.SQL.Add('  VALUES (SRC.nome, SRC.descricao) ');
        FDQ_Append.SQL.Add('RETURNING m.id ');

        FDQ_Append.ParamByName('id').AsInteger := LObj.GetValue<Integer>('codigo', 0);
        FDQ_Append.ParamByName('nome').AsString := Trim(LObj.GetValue<String>('nome', ''));
        FDQ_Append.ParamByName('descricao').AsString := Trim(LObj.GetValue<String>('descricao', ''));
        FDQ_Append.Open;

        if not FDQ_Append.IsEmpty then
          FCódigoRetorno := FDQ_Append.Fields[0].AsInteger;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('codigo', TJSONNumber.Create(FCódigoRetorno));
      Result.JSonObject.AddPair('mensagem', 'Modulo inserido/atualizado com sucesso');
      Result.Menssage := 'Modulo Inserido/Atualizado com sucesso. Código: ' + FCódigoRetorno.ToString;

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: EArgumentException do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 400;
        Result.Menssage := 'Parametros invalidos: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Append) then
      FDQ_Append.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Modulo_Delete(out fJson: TJSONObject; const aId: Integer; const aEmpresaId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Select: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      if aId = 0 then
      begin
        Result.Id := 401;
        Result.Menssage := 'Não foi informado o codigo do Modulo para excluir.';
        GravarLogJSON('uDataBase.Manager', 'Modulo_Excluir', 'uDataBase.Manager', Exception.Create(Result.Menssage));
        Exit;
      end;

      fDm.FDConnection.StartTransaction;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('delete from public.modulo where id = :Id ');
      FDQ_Select.ParamByName('id').AsInteger := aId;
      FDQ_Select.ExecSQL;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create(TJSONPair.Create('mensagem', 'Modulo ' + aId.ToString + ', excluido com sucesso'));
      fJson := Result.JSonObject;
      Result.Menssage := 'Modulo ' + aId.ToString + ' excluido com sucesso';

      fDm.FDConnection.Commit;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EArgumentException do
      begin
        Result.Id := 400;
        Result.Menssage := 'Parametros invalidos: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
      on E: EAccessViolation do
      begin
        Result.Id := 403;
        Result.Menssage := 'Acesso não permitido.';
        fDm.FDConnection.Rollback;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
        fDm.FDConnection.Rollback;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Modulo Formulario }

function TDataBaseManager.ModuloFormulario_Listar(out fJson: TJSONArray; const aModuloId: Integer; const aFormularioId: Integer; const aEmpresaId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Select: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select mf.*, f.nome as formulario_nome ');
      FDQ_Select.Sql.Add('from public.modulo_formulario mf ');
      FDQ_Select.Sql.Add('join public.formulario f on f.id = mf.formulario_id ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aModuloId > 0 then
      begin
        FDQ_Select.Sql.Add('  and mf.modulo_id = :modulo_id ');
        FDQ_Select.ParamByName('modulo_id').AsInteger := aModuloId;
      end;
      if aFormularioId > 0 then
      begin
        FDQ_Select.Sql.Add('  and mf.formulario_id = :formulario_id ');
        FDQ_Select.ParamByName('formulario_id').AsInteger := aFormularioId;
      end;
      if aEmpresaId > 0 then
      begin
        FDQ_Select.Sql.Add('  and mf.modulo_id in (select em.modulo_id from public.empresa_modulo em where em.empresa_id = :mf_empresa_id) ');
        FDQ_Select.ParamByName('mf_empresa_id').AsInteger := aEmpresaId;
      end;
      FDQ_Select.Sql.Add('order by mf.id; ');
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Nenhum vinculo modulo/formulario encontrado.';
        fJson := TJSONArray.Create;
        Result.JSonArray := fJson;
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.ModuloFormulario_Salvar(
  const aModuloId: Integer; const aFormularios: TJSONArray;
  const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Exec: TFDQuery;
  I: Integer;
  lFormularioId, lAbertura: Integer;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Exec := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Exec := TFDQuery.Create(nil);
      FDQ_Exec.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      fDm.FDConnection.StartTransaction;

      FDQ_Exec.Close;
      FDQ_Exec.Sql.Clear;
      FDQ_Exec.Sql.Add('delete from public.modulo_formulario where modulo_id = :modulo_id');
      FDQ_Exec.ParamByName('modulo_id').AsInteger := aModuloId;
      FDQ_Exec.ExecSQL;

      for I := 0 to aFormularios.Count - 1 do
      begin
        lFormularioId := aFormularios.Items[I].GetValue<Integer>('formulario_id');
        lAbertura     := aFormularios.Items[I].GetValue<Integer>('abertura');
        if lFormularioId > 0 then
        begin
          FDQ_Exec.Close;
          FDQ_Exec.Sql.Clear;
          FDQ_Exec.Sql.Add(
            'insert into public.modulo_formulario ' +
            '(modulo_id, formulario_id, abertura) ' +
            'values (:modulo_id, :formulario_id, :abertura)'
          );
          FDQ_Exec.ParamByName('modulo_id').AsInteger     := aModuloId;
          FDQ_Exec.ParamByName('formulario_id').AsInteger := lFormularioId;
          FDQ_Exec.ParamByName('abertura').AsInteger      := lAbertura;
          FDQ_Exec.ExecSQL;
        end;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('mensagem', 'Vinculos modulo/formulario salvos com sucesso');
      Result.Menssage := 'Vinculos modulo/formulario salvos com sucesso';

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Exec) then
      FDQ_Exec.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ Empresa Modulo }

function TDataBaseManager.EmpresaModulo_Listar(out fJson: TJSONArray; const aEmpresaIdFiltro: Integer; const aModuloId: Integer; const aEmpresaId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Select: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select em.*, m.nome as modulo_nome ');
      FDQ_Select.Sql.Add('from public.empresa_modulo em ');
      FDQ_Select.Sql.Add('join public.modulo m on m.id = em.modulo_id ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aEmpresaIdFiltro > 0 then
      begin
        FDQ_Select.Sql.Add('  and em.empresa_id = :empresa_id_filtro ');
        FDQ_Select.ParamByName('empresa_id_filtro').AsInteger := aEmpresaIdFiltro;
      end;
      if aModuloId > 0 then
      begin
        FDQ_Select.Sql.Add('  and em.modulo_id = :modulo_id ');
        FDQ_Select.ParamByName('modulo_id').AsInteger := aModuloId;
      end;
      FDQ_Select.Sql.Add('order by em.id; ');
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Nenhum vinculo empresa/modulo encontrado.';
        fJson := TJSONArray.Create;
        Result.JSonArray := fJson;
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.EmpresaModulo_Salvar(const aEmpresaIdAlvo: Integer; const aModulos: TJSONArray; const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Exec: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Exec := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Exec := TFDQuery.Create(nil);
      FDQ_Exec.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      fDm.FDConnection.StartTransaction;

      // Delete existing associations for this empresa
      FDQ_Exec.Close;
      FDQ_Exec.Sql.Clear;
      FDQ_Exec.Sql.Add('delete from public.empresa_modulo where empresa_id = :empresa_id ');
      FDQ_Exec.ParamByName('empresa_id').AsInteger := aEmpresaIdAlvo;
      FDQ_Exec.ExecSQL;

      // Insert new associations
      for var I := 0 to aModulos.Count - 1 do
      begin
        var lModuloId := StrToIntDef(aModulos.Items[I].Value, 0);
        if lModuloId > 0 then
        begin
          FDQ_Exec.Close;
          FDQ_Exec.Sql.Clear;
          FDQ_Exec.Sql.Add('insert into public.empresa_modulo (empresa_id, modulo_id) values (:empresa_id, :modulo_id) ');
          FDQ_Exec.ParamByName('empresa_id').AsInteger := aEmpresaIdAlvo;
          FDQ_Exec.ParamByName('modulo_id').AsInteger := lModuloId;
          FDQ_Exec.ExecSQL;
        end;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('mensagem', 'Vinculos empresa/modulo salvos com sucesso');
      Result.Menssage := 'Vinculos empresa/modulo salvos com sucesso';

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Exec) then
      FDQ_Exec.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.ModuloFormulario_Delete(const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Exec: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Exec := nil;

  try
    try
      if aId = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'Código do vinculo não informado.';
        Exit;
      end;

      fDm := TDM.Create(nil);
      FDQ_Exec := TFDQuery.Create(nil);
      FDQ_Exec.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      fDm.FDConnection.StartTransaction;

      FDQ_Exec.Close;
      FDQ_Exec.Sql.Clear;
      FDQ_Exec.Sql.Add('delete from public.modulo_formulario where id = :id');
      FDQ_Exec.ParamByName('id').AsInteger := aId;
      FDQ_Exec.ExecSQL;

      fDm.FDConnection.Commit;

      Result.Id := 200;
      Result.Menssage := 'Vinculo modulo/formulario excluido com sucesso.';
    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Exec) then
      FDQ_Exec.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.EmpresaModulo_Delete(const aId: Integer = 0; const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Exec: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Exec := nil;

  try
    try
      if aId = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'Código do vinculo não informado.';
        Exit;
      end;

      fDm := TDM.Create(nil);
      FDQ_Exec := TFDQuery.Create(nil);
      FDQ_Exec.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      fDm.FDConnection.StartTransaction;

      FDQ_Exec.Close;
      FDQ_Exec.Sql.Clear;
      FDQ_Exec.Sql.Add('delete from public.empresa_modulo where id = :id');
      FDQ_Exec.ParamByName('id').AsInteger := aId;
      FDQ_Exec.ExecSQL;

      fDm.FDConnection.Commit;

      Result.Id := 200;
      Result.Menssage := 'Vinculo empresa/modulo excluido com sucesso.';
    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Exec) then
      FDQ_Exec.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

{ UsuarioEmpresa }

function TDataBaseManager.UsuarioEmpresa_Listar(out fJson: TJSONArray;
  const aUsuarioIdFiltro: Integer; const aEmpresaIdFiltro: Integer;
  const aEmpresaId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Select: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  FDQ_Select := nil;
  fDm := nil;
  try
    try
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select ue.*, e.razao_social as empresa_nome, u.nome as usuario_nome ');
      FDQ_Select.Sql.Add('from public.usuario_empresa ue ');
      FDQ_Select.Sql.Add('join public.empresa e on e.id = ue.empresa_id ');
      FDQ_Select.Sql.Add('join public.usuario u on u.id = ue.usuario_id ');
      FDQ_Select.Sql.Add('where 1=1 ');
      if aUsuarioIdFiltro > 0 then
      begin
        FDQ_Select.Sql.Add('  and ue.usuario_id = :usuario_id ');
        FDQ_Select.ParamByName('usuario_id').AsInteger := aUsuarioIdFiltro;
      end;
      if aEmpresaIdFiltro > 0 then
      begin
        FDQ_Select.Sql.Add('  and ue.empresa_id = :empresa_id ');
        FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaIdFiltro;
      end;
      FDQ_Select.Sql.Add('order by ue.ud; ');
      FDQ_Select.Open;

      if FDQ_Select.IsEmpty then
      begin
        Result.Id := 404;
        Result.Menssage := 'Nenhum vinculo usuario/empresa encontrado.';
        fJson := TJSONArray.Create;
        Result.JSonArray := fJson;
      end
      else
      begin
        fJson := FDQ_Select.ToJSONArray;
        Result.Id := 200;
        Result.JSonArray := fJson;
      end;
    except
      on E: EDatabaseError do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.UsuarioEmpresa_Salvar(
  const aUsuarioIdAlvo: Integer; const aEmpresas: TJSONArray;
  const aEmpresaId: Integer; const aUsuarioId: Integer): TReturn;
var
  fDm: TDM;
  FDQ_Exec: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Exec := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Exec := TFDQuery.Create(nil);
      FDQ_Exec.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      fDm.FDConnection.StartTransaction;

      FDQ_Exec.Close;
      FDQ_Exec.Sql.Clear;
      FDQ_Exec.Sql.Add('delete from public.usuario_empresa where usuario_id = :usuario_id ');
      FDQ_Exec.ParamByName('usuario_id').AsInteger := aUsuarioIdAlvo;
      FDQ_Exec.ExecSQL;

      for var I := 0 to aEmpresas.Count - 1 do
      begin
        var lEmpresaId := StrToIntDef(aEmpresas.Items[I].Value, 0);
        if lEmpresaId > 0 then
        begin
          FDQ_Exec.Close;
          FDQ_Exec.Sql.Clear;
          FDQ_Exec.Sql.Add('insert into public.usuario_empresa (usuario_id, empresa_id) values (:usuario_id, :empresa_id) ');
          FDQ_Exec.ParamByName('usuario_id').AsInteger := aUsuarioIdAlvo;
          FDQ_Exec.ParamByName('empresa_id').AsInteger := lEmpresaId;
          FDQ_Exec.ExecSQL;
        end;
      end;

      fDm.FDConnection.Commit;
      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('mensagem', 'Vinculos usuario/empresa salvos com sucesso');
      Result.Menssage := 'Vinculos usuario/empresa salvos com sucesso';

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Exec) then
      FDQ_Exec.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.UsuarioEmpresa_Delete(const aId: Integer = 0;
  const aEmpresaId: Integer = 0): TReturn;
var
  fDm: TDM;
  FDQ_Exec: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ_Exec := nil;

  try
    try
      if aId = 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'Código do vinculo não informado.';
        Exit;
      end;

      fDm := TDM.Create(nil);
      FDQ_Exec := TFDQuery.Create(nil);
      FDQ_Exec.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      fDm.FDConnection.StartTransaction;

      FDQ_Exec.Close;
      FDQ_Exec.Sql.Clear;
      FDQ_Exec.Sql.Add('delete from public.usuario_empresa where ud = :ud');
      FDQ_Exec.ParamByName('ud').AsInteger := aId;
      FDQ_Exec.ExecSQL;

      fDm.FDConnection.Commit;

      Result.Id := 200;
      Result.Menssage := 'Vinculo usuario/empresa excluido com sucesso.';
    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ_Exec) then
      FDQ_Exec.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.VerificarUsuarioEmpresa(const aUsuarioId: Integer; const aEmpresaId: Integer): Boolean;
var
  fDm: TDM;
  FDQ_Select: TFDQuery;
begin
  Result := False;

  if (aUsuarioId <= 0) or (aEmpresaId <= 0) then
    Exit;

  fDm := nil;
  FDQ_Select := nil;

  try
    try
      fDm := TDM.Create(nil);
      FDQ_Select := TFDQuery.Create(Nil);
      FDQ_Select.Connection := fDm.FDConnection;
      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      FDQ_Select.Close;
      FDQ_Select.Sql.Clear;
      FDQ_Select.Sql.Add('select 1 from public.usuario_empresa where usuario_id = :usuario_id and empresa_id = :empresa_id');
      FDQ_Select.ParamByName('usuario_id').AsInteger := aUsuarioId;
      FDQ_Select.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ_Select.Open;

      Result := not FDQ_Select.IsEmpty;
    except
      Result := False;
    end;
  finally
    if Assigned(FDQ_Select) then
      FDQ_Select.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

function TDataBaseManager.Empresa_LimparDados(const aEmpresaId: Integer): TReturn;
var
  fDm: TDM;
  FDQ: TFDQuery;
begin
  with Result do
  begin
    Id := -1;
    Menssage := EmptyStr;
    JSonObject := Nil;
    JSonArray := Nil;
  end;

  fDm := nil;
  FDQ := nil;

  try
    try
      if aEmpresaId <= 0 then
      begin
        Result.Id := 400;
        Result.Menssage := 'Código da Empresa não informado.';
        Exit;
      end;

      fDm := TDM.Create(nil);
      FDQ := TFDQuery.Create(nil);
      FDQ.Connection := fDm.FDConnection;

      if not fDm.FDConnection.Connected then
        fDm.ConectarBanco;

      fDm.FDConnection.StartTransaction;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from servicos.horas_excedidas where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from servicos.horas_abatidas where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from servicos.horas_trabalhadas where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.estoque_insumo ei using gestor.insumo i where ei.insumo_id = i.id and i.empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.estoque_produto_fabricado epf using gestor.produto_fabricado pf where epf.produto_fabricado_id = pf.id and pf.empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.fabricacao_custo_adicional fca using gestor.fabricacao f where fca.fabricacao_id = f.id and f.empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.venda_produto where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.receita_ingrediente ri using gestor.produto_fabricado pf where ri.produto_fabricado_id = pf.id and pf.empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.compra_insumo where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.fabricacao where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.contas_receber where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.contas_pagar where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.usuario_formulario_permissao ufp using gestor.usuario_formulario uf, gestor.usuario u where ufp.usuario_formulario_id = uf.id and uf.usuario_id = u.id and u.empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.usuario_formulario uf using gestor.usuario u where uf.usuario_id = u.id and u.empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from public.usuario_empresa where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from public.empresa_modulo where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from public.formulario where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from servicos.servico where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.custo_adicional_tipo where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.produto_fabricado where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.insumo where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.categoria_receber where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.categoria_pagar where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.fornecedor where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.cliente where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      FDQ.Close;
      FDQ.SQL.Clear;
      FDQ.SQL.Add('delete from gestor.usuario where empresa_id = :empresa_id');
      FDQ.ParamByName('empresa_id').AsInteger := aEmpresaId;
      FDQ.ExecSQL;

      fDm.FDConnection.Commit;

      Result.Id := 200;
      Result.JSonObject := TJSONObject.Create;
      Result.JSonObject.AddPair('mensagem', 'Dados da empresa ' + aEmpresaId.ToString + ' limpos com sucesso.');
      Result.Menssage := 'Dados limpos com sucesso.';

    except
      on E: EDatabaseError do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro no banco de dados: ' + E.Message;
      end;
      on E: Exception do
      begin
        if Assigned(fDm) and fDm.FDConnection.InTransaction then
          fDm.FDConnection.Rollback;
        Result.Id := 500;
        Result.Menssage := 'Erro inesperado: ' + E.Message;
      end;
    end;
  finally
    if Assigned(FDQ) then
      FDQ.Free;
    if Assigned(fDm) then
      fDm.Free;
  end;
end;

end.
