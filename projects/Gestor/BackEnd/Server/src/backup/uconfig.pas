unit uConfig;

{$mode Delphi}{$H+}

interface

uses
  Classes, SysUtils, Forms, Controls, Graphics, Dialogs, ExtCtrls, StdCtrls,
  IniFiles;

type

	{ TfrmConfig }

  TfrmConfig = class(TForm)
    btnExibirSenha: TButton;
    btnSelecionarDLL: TButton;
    btnCancelar: TButton;
    btnSalvar: TButton;
    edtServidor: TEdit;
    edtPorta: TEdit;
    edtBancoDados: TEdit;
    edtUsuario: TEdit;
    edtSenha: TEdit;
    edtDLLPath: TEdit;
    edServer_Port: TEdit;
    Label1: TLabel;
    Label2: TLabel;
    Label3: TLabel;
    Label4: TLabel;
    Label5: TLabel;
    Label6: TLabel;
    Label7: TLabel;
    Panel1: TPanel;
    Panel2: TPanel;
    Panel3: TPanel;
    Panel4: TPanel;
    Panel5: TPanel;
    pnBancoDados: TPanel;
    pnServer: TPanel;
    pnFooter: TPanel;
		procedure FormClose(Sender: TObject; var CloseAction: TCloseAction);
    procedure FormShow(Sender: TObject);
    procedure btnSalvarClick(Sender: TObject);
    procedure btnCancelarClick(Sender: TObject);
    procedure btnExibirSenhaClick(Sender: TObject);
    procedure btnSelecionarDLLClick(Sender: TObject);
  private
    procedure CarregarConfig;
    procedure SalvarConfig;
  end;

var
  frmConfig: TfrmConfig;

implementation

{$R *.lfm}

uses
  uBase.Functions;

procedure TfrmConfig.FormShow(Sender: TObject);
begin
  CarregarConfig;
end;

procedure TfrmConfig.FormClose(Sender: TObject; var CloseAction: TCloseAction);
begin
  Action := caFree;
end;

procedure TfrmConfig.CarregarConfig;
begin
  edtServidor.Text := LerIni('BANCO', 'HOST', ConfigFile);
  edtPorta.Text := LerIni('BANCO', 'PORT', ConfigFile);
  edtBancoDados.Text := LerIni('BANCO', 'DATABASE', ConfigFile);
  edtUsuario.Text := LerIni('BANCO', 'USER', ConfigFile);
  edtSenha.Text := LerIni('BANCO', 'PASSWORD', ConfigFile);
  edtDLLPath.Text := LerIni('BANCO', 'DLLPATH', ConfigFile);
  edServer_Port.Text := LerIni('SERVER', 'PORT', ConfigFile);
end;

procedure TfrmConfig.SalvarConfig;
var
  Ini: TIniFile;
begin
  Ini := TIniFile.Create(ConfigFile);
  try
    Ini.WriteString('BANCO', 'HOST', edtServidor.Text);
    Ini.WriteString('BANCO', 'PORT', edtPorta.Text);
    Ini.WriteString('BANCO', 'DATABASE', edtBancoDados.Text);
    Ini.WriteString('BANCO', 'USER', edtUsuario.Text);
    Ini.WriteString('BANCO', 'PASSWORD', edtSenha.Text);
    Ini.WriteString('BANCO', 'DLLPATH', edtDLLPath.Text);
    Ini.WriteString('SERVER', 'PORT', edServer_Port.Text);
  finally
    Ini.Free;
  end;
end;

procedure TfrmConfig.btnSalvarClick(Sender: TObject);
begin
  SalvarConfig;
  Close;
end;

procedure TfrmConfig.btnCancelarClick(Sender: TObject);
begin
  Close;
end;

procedure TfrmConfig.btnExibirSenhaClick(Sender: TObject);
begin
  if edtSenha.EchoMode = emNormal then
    edtSenha.EchoMode := emPassword
  else
    edtSenha.EchoMode := emNormal;
end;

procedure TfrmConfig.btnSelecionarDLLClick(Sender: TObject);
var
  Dlg: TOpenDialog;
begin
  Dlg := TOpenDialog.Create(Self);
  try
    Dlg.Filter := 'DLL Files|*.dll|All Files|*.*';
    Dlg.DefaultExt := 'dll';
    if Dlg.Execute then
      edtDLLPath.Text := Dlg.FileName;
  finally
    Dlg.Free;
  end;
end;

end.
