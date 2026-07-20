unit uPrincipal;

interface

uses
  Winapi.Windows, Winapi.Messages, System.SysUtils, System.Variants, System.Classes,
  System.JSON, System.IOUtils, System.Generics.Collections,
  Vcl.Graphics,
  Vcl.Controls, Vcl.Forms, Vcl.Dialogs, Vcl.StdCtrls, Vcl.ExtCtrls,
  Vcl.Themes, Vcl.Styles,

  {$Region 'Horse'}
    Horse,
    Horse.Jhonson,
    Horse.BasicAuthentication,
    Horse.CORS,
    DataSet.Serialize.Config,
  {$EndRegion 'Horse'}

  uRotas, uBase.Functions, uConfig, Vcl.ComCtrls;

type
  TfrmPrincipal = class(TForm)
    pnHeader: TPanel;
    pnBody: TPanel;
    pnFooter: TPanel;
    lbStatus: TLabel;
    lbServer_Port_Ativa: TLabel;
    Button1: TButton;
    Button2: TButton;
    TreeView_Log: TTreeView;
    pnBody_Titulo: TPanel;
    lbFiltro: TLabel;
    DateTimePicker1: TDateTimePicker;
    lbA: TLabel;
    DateTimePicker2: TDateTimePicker;
    procedure FormCreate(Sender: TObject);
    procedure FormDestroy(Sender: TObject);
    procedure FormShow(Sender: TObject);
    procedure Button1Click(Sender: TObject);
    procedure Button2Click(Sender: TObject);
    procedure DateTimePickerChange(Sender: TObject);
  private
    FThreadLog: TThread;
    procedure CarregarLogs;
  public
    { Public declarations }
  end;

var
  frmPrincipal: TfrmPrincipal;

implementation


const
  CNativeWindowsStyleName = 'Windows';
  CNativeWindowsStyleDisplay = 'Windows (Nativo)';


{$R *.dfm}

type
  TLogRefreshThread = class(TThread)
  private
    FOwner: TfrmPrincipal;
  protected
    procedure Execute; override;
  public
    constructor Create(AOwner: TfrmPrincipal);
  end;

constructor TLogRefreshThread.Create(AOwner: TfrmPrincipal);
begin
  inherited Create(True);
  FOwner := AOwner;
  FreeOnTerminate := False;
end;

procedure TLogRefreshThread.Execute;
begin
  while not Terminated do
  begin
    Sleep(60000);
    if not Terminated then
      TThread.Queue(nil,
        procedure
        begin
          if Assigned(FOwner) then
            FOwner.CarregarLogs;
        end);
  end;
end;

procedure TfrmPrincipal.CarregarLogs;
var
  LArquivos: TArray<string>;
  LArquivo: string;
  LConteudo: string;
  LJsonValue: TJSONValue;
  LJsonArray: TJSONArray;
  I, J, K: Integer;
  LObjDia: TJSONObject;
  LDataStr: string;
  LData, LDataIni, LDataFim: TDateTime;
  LRaizNode, LLogsNode, LTimeNode: TTreeNode;
  LLogsArray: TJSONArray;
  LLogObj: TJSONObject;
  LSelText, LSelParentText: string;

  procedure AddField(const ANode: TTreeNode; const AKey, AVal: string);
  begin
    if Trim(AVal) <> '' then
      TreeView_Log.Items.AddChild(ANode, AKey + ': ' + AVal);
  end;

begin
  LDataIni := Trunc(DateTimePicker1.Date);
  LDataFim := Trunc(DateTimePicker2.Date);
  if LDataIni > LDataFim then
    LDataFim := LDataIni;
  if Assigned(TreeView_Log.Selected) then
  begin
    LSelText := TreeView_Log.Selected.Text;
    if Assigned(TreeView_Log.Selected.Parent) then
      LSelParentText := TreeView_Log.Selected.Parent.Text
    else
      LSelParentText := '';
  end
  else
  begin
    LSelText := '';
    LSelParentText := '';
  end;

  TreeView_Log.Items.BeginUpdate;
  try
    TreeView_Log.Items.Clear;

    LArquivos := TDirectory.GetFiles(EndPath, NameEXE + '*_Log.json');
    TArray.Sort<string>(LArquivos);

    for var A := High(LArquivos) downto Low(LArquivos) do
    begin
      LArquivo := LArquivos[A];
      try
        LConteudo := TFile.ReadAllText(LArquivo);
      except
        Continue;
      end;
      if LConteudo.Trim.IsEmpty then
        Continue;

      LJsonValue := TJSONObject.ParseJSONValue(LConteudo);
      if not (LJsonValue is TJSONArray) then
      begin
        LJsonValue.Free;
        Continue;
      end;

      LJsonArray := LJsonValue as TJSONArray;
      try
        for I := LJsonArray.Count - 1 downto 0 do
        begin
          if not (LJsonArray.Items[I] is TJSONObject) then
            Continue;

          LObjDia := LJsonArray.Items[I] as TJSONObject;
          LDataStr := LObjDia.GetValue<string>('date', '');
          if LDataStr = '' then
            Continue;

          if not TryParseIsoDate(LDataStr, LData) then
            Continue;

          if (LData < LDataIni) or (LData > LDataFim) then
            Continue;

          LRaizNode := TreeView_Log.Items.AddChild(nil, LDataStr);

          TreeView_Log.Items.AddChild(LRaizNode, 'product_name: ' + LObjDia.GetValue<string>('product_name', ''));
          TreeView_Log.Items.AddChild(LRaizNode, 'version: ' + LObjDia.GetValue<string>('version', ''));
          TreeView_Log.Items.AddChild(LRaizNode, 'usuario_pc: ' + LObjDia.GetValue<string>('usuario_pc', ''));

          LLogsNode := TreeView_Log.Items.AddChild(LRaizNode, 'logs');

          if LObjDia.TryGetValue<TJSONArray>('logs', LLogsArray) then
          begin
            for J := LLogsArray.Count - 1 downto 0 do
            begin
              if not (LLogsArray.Items[J] is TJSONObject) then
                Continue;

              LLogObj := LLogsArray.Items[J] as TJSONObject;

              LTimeNode := TreeView_Log.Items.AddChild(LLogsNode, LLogObj.GetValue<string>('time', ''));

              AddField(LTimeNode, 'type', LLogObj.GetValue<string>('type', ''));
              AddField(LTimeNode, 'level', LLogObj.GetValue<string>('level', ''));
              AddField(LTimeNode, 'form_name', LLogObj.GetValue<string>('form_name', ''));
              AddField(LTimeNode, 'caption_name', LLogObj.GetValue<string>('caption_name', ''));
              AddField(LTimeNode, 'unit', LLogObj.GetValue<string>('unit', ''));
              AddField(LTimeNode, 'user', LLogObj.GetValue<string>('user', ''));
              AddField(LTimeNode, 'sql', LLogObj.GetValue<string>('sql', ''));
              AddField(LTimeNode, 'extra', LLogObj.GetValue<string>('extra', ''));
              AddField(LTimeNode, 'json_in', LLogObj.GetValue<string>('json_in', ''));
              AddField(LTimeNode, 'json_out', LLogObj.GetValue<string>('json_out', ''));
              AddField(LTimeNode, 'exception_class', LLogObj.GetValue<string>('exception_class', ''));
              AddField(LTimeNode, 'exception_description', LLogObj.GetValue<string>('exception_description', ''));
              AddField(LTimeNode, 'message', LLogObj.GetValue<string>('message', ''));
            end;
          end;
        end;
      finally
        LJsonArray.Free;
      end;
    end;

    var LExpandidos := 0;

    for K := 0 to TreeView_Log.Items.Count - 1 do
      if TreeView_Log.Items[K].Parent = nil then
        TreeView_Log.Items[K].Expand(False);

    for K := 0 to TreeView_Log.Items.Count - 1 do
      if (TreeView_Log.Items[K].Parent <> nil) and
         (TreeView_Log.Items[K].Parent.Text = 'logs') then
      begin
        if not TreeView_Log.Items[K].Parent.Expanded then
          TreeView_Log.Items[K].Parent.Expand(False);
        TreeView_Log.Items[K].Expand(True);
        Inc(LExpandidos);
        if LExpandidos >= 5 then
          Break;
      end;

    if LSelText <> '' then
    begin
      for K := 0 to TreeView_Log.Items.Count - 1 do
        if (TreeView_Log.Items[K].Text = LSelText) and
           ((LSelParentText = '') or
            (Assigned(TreeView_Log.Items[K].Parent) and
             (TreeView_Log.Items[K].Parent.Text = LSelParentText))) then
        begin
          TreeView_Log.Items[K].Selected := True;
          TreeView_Log.Items[K].MakeVisible;
          Break;
        end;
    end
    else if TreeView_Log.Items.Count > 0 then
    begin
      TreeView_Log.Items[0].Selected := True;
      TreeView_Log.Items[0].MakeVisible;
    end;
  finally
    TreeView_Log.Items.EndUpdate;
  end;
end;

procedure TfrmPrincipal.Button1Click(Sender: TObject);
var
  frm: TfrmConfig;
begin
  frm := TfrmConfig.Create(Self);
  try
    frm.ShowModal;
  finally
    frm.Free;
  end;
end;

procedure TfrmPrincipal.Button2Click(Sender: TObject);
begin
  CarregarLogs;
end;

procedure TfrmPrincipal.FormCreate(Sender: TObject);
var
  LStyle: string;
begin

  LStyle := Trim(LerIni('APARENCIA', 'STYLE', ConfigFile));
  if LStyle <> '' then
    TStyleManager.TrySetStyle(LStyle);

  FThreadLog := TLogRefreshThread.Create(Self);
  FThreadLog.Start;

end;

procedure TfrmPrincipal.FormDestroy(Sender: TObject);
begin
  if Assigned(FThreadLog) then
  begin
    FThreadLog.Terminate;
    FThreadLog.WaitFor;
    FreeAndNil(FThreadLog);
  end;
end;

procedure TfrmPrincipal.DateTimePickerChange(Sender: TObject);
begin
  CarregarLogs;
end;

procedure TfrmPrincipal.FormShow(Sender: TObject);
begin
  DateTimePicker1.Date := Date;
  DateTimePicker2.Date := Date;
  DateTimePicker1.OnChange := DateTimePickerChange;
  DateTimePicker2.OnChange := DateTimePickerChange;

  CarregarLogs;

  {$Region 'Configurando Horse'}
    TDataSetSerializeConfig.GetInstance.CaseNameDefinition := cndLower;
    THorse.Use(Jhonson());
    THorse.Use(CORS);

    RegistrarRotas;

    var lPorta := 0;
    lPorta := StrToIntDef(LerIni('SERVER','PORT',ConfigFile),0);
    THorse.Listen(lPorta,
      procedure
      begin
        lbServer_Port_Ativa.Caption := 'Servidor executando na porta:' + lPorta.ToString;
      end);
  {$EndRegion 'Configurando Horse'}

end;

end.
