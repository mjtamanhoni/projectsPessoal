unit uConfig;

{$mode ObjFPC}{$H+}

interface

uses
      Classes, SysUtils, Forms, Controls, Graphics, Dialogs, ExtCtrls, StdCtrls;

type

			{ TForm2 }

      TForm2 = class(TForm)
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
      private

      public

      end;

var
      Form2: TForm2;

implementation

{$R *.lfm}

end.

